import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface InlineContactFormProps {
  category: string;
  title?: string;
  placeholder?: string;
  buttonLabel?: string;
  className?: string;
}

export default function InlineContactForm({
  category,
  title = 'Send Us a Message',
  placeholder = 'Describe your inquiry in detail...',
  buttonLabel = 'Submit',
  className = '',
}: InlineContactFormProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please write a message before submitting.');
      return;
    }
    if (!user && !email.trim()) {
      toast.error('Please provide your email address.');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('feedback_tickets').insert({
        user_id: user?.id || null,
        user_email: user?.email || email.trim() || null,
        type: category,
        message: message.trim(),
      });
      if (error) throw error;
      setSent(true);
      setMessage('');
      toast.success('Your message has been sent successfully!');
    } catch (err) {
      console.error('Contact form error:', err);
      toast.error('Failed to send. Please try again later.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className={`rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center ${className}`}>
        <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-white mb-1">Message Received</h3>
        <p className="text-xs text-white/50">Thank you for reaching out. Our team will review your message shortly.</p>
        <button
          onClick={() => setSent(false)}
          className="mt-3 text-xs text-cyan-400 hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.02] p-5 ${className}`}>
      {title && <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>}
      {!user && (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          className="w-full mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        />
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
      />
      <button
        onClick={handleSubmit}
        disabled={sending}
        className="mt-2 inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
      >
        <Send className="w-3.5 h-3.5" />
        {sending ? 'Sending...' : buttonLabel}
      </button>
    </div>
  );
}
