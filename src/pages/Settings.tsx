import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProfile, useUpdateProfile, planLabels } from '@/hooks/useProfile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import vizionLogo from '@/assets/vizionx-logo.png';
import {
  ArrowLeft, User, Shield, CreditCard, Receipt, Bell, Globe, Youtube, Instagram, Twitter,
  Facebook, Link2, Save, Monitor, Smartphone, Tablet, Laptop, LogOut, Loader2, MessageSquare, Send,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const sidebarSections = [
  {
    label: 'PROFILE AND PRIVACY',
    items: [
      { id: 'profile', label: 'Public profile', icon: User },
    ],
  },
  {
    label: 'ACCOUNT AND SECURITY',
    items: [
      { id: 'account', label: 'Account settings', icon: Shield },
      { id: 'sessions', label: 'Active sessions', icon: Monitor },
    ],
  },
  {
    label: 'BILLING',
    items: [
      { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
      { id: 'billing', label: 'Billing history', icon: Receipt },
    ],
  },
  {
    label: 'NOTIFICATIONS',
    items: [
      { id: 'notifications', label: 'Alerts delivery', icon: Bell },
    ],
  },
  {
    label: 'SUPPORT',
    items: [
      { id: 'support', label: 'Contact support', icon: MessageSquare },
    ],
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [activeSection, setActiveSection] = useState('profile');

  const [form, setForm] = useState({
    username: '',
    x_profile: '',
    youtube_channel: '',
    facebook_profile: '',
    instagram_profile: '',
    website: '',
    signature: '',
  });
  const [formLoaded, setFormLoaded] = useState(false);

  // Sessions state
  interface SessionInfo {
    id: string;
    created_at: string;
    updated_at: string;
    refreshed_at: string | null;
    ip: string;
    device: string;
    os: string;
    browser: string;
  }
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const parseUserAgent = (ua: string) => {
    let device = 'PC', os = 'Unknown', browser = 'Unknown';
    if (/iPad/i.test(ua)) device = 'iPad';
    else if (/iPhone/i.test(ua)) device = 'iPhone';
    else if (/Android.*Mobile/i.test(ua)) device = 'Mobile';
    else if (/Android/i.test(ua)) device = 'Tablet';
    else if (/Macintosh/i.test(ua)) device = 'Mac';
    if (/Windows NT 10/i.test(ua)) os = 'Windows 10';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/iPhone OS/i.test(ua)) os = 'iOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Linux/i.test(ua)) os = 'Linux';
    if (/Edg\/([\d.]+)/i.test(ua)) browser = 'Edge';
    else if (/Chrome\/([\d.]+)/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    return { device, os, browser };
  };

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      if (!user) return;
      const { data: rawSessions, error } = await supabase.rpc('get_user_sessions', { p_user_id: user.id });
      if (error) throw error;
      const enriched = (rawSessions || []).map((s: any) => {
        const ua = s.real_user_agent || s.user_agent || '';
        const parsed = parseUserAgent(ua);
        const ip = s.real_ip || (s.ip ? String(s.ip) : 'Unknown');
        return {
          id: s.session_id,
          created_at: s.created_at,
          updated_at: s.updated_at,
          refreshed_at: s.refreshed_at,
          ip,
          ...parsed,
        };
      });
      setSessions(enriched);
    } catch (e) {
      console.error('Failed to fetch sessions', e);
    } finally {
      setSessionsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeSection === 'sessions') fetchSessions();
  }, [activeSection, fetchSessions]);

  const revokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      if (!user) return;
      const { error } = await supabase.rpc('revoke_user_session', {
        p_user_id: user.id,
        p_session_id: sessionId,
      });
      if (error) throw error;
      setSessions(s => s.filter(x => x.id !== sessionId));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  const getDeviceIcon = (device: string) => {
    if (['iPhone', 'Mobile'].includes(device)) return Smartphone;
    if (['iPad', 'Tablet'].includes(device)) return Tablet;
    if (device === 'Mac') return Laptop;
    return Monitor;
  };

  const formatSessionTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${time}`;
    return d.toLocaleDateString([], { day: 'numeric', month: 'long' }) + `, ${time}`;
  };

  if (profile && !formLoaded) {
    setForm({
      username: profile.username || '',
      x_profile: profile.x_profile || '',
      youtube_channel: profile.youtube_channel || '',
      facebook_profile: profile.facebook_profile || '',
      instagram_profile: profile.instagram_profile || '',
      website: profile.website || '',
      signature: profile.signature || '',
    });
    setFormLoaded(true);
  }

  const handleSaveLinks = async () => {
    try {
      await updateProfile.mutateAsync({
        x_profile: form.x_profile || null,
        youtube_channel: form.youtube_channel || null,
        facebook_profile: form.facebook_profile || null,
        instagram_profile: form.instagram_profile || null,
        website: form.website || null,
      });
      toast.success('Links saved successfully');
    } catch {
      toast.error('Failed to save links');
    }
  };

  const handleSaveSignature = async () => {
    try {
      await updateProfile.mutateAsync({ signature: form.signature || null });
      toast.success('Signature saved successfully');
    } catch {
      toast.error('Failed to save signature');
    }
  };

  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const plan = profile?.plan || 'core';

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft size={18} className="text-white/60" />
        </button>
        <div className="flex items-center gap-2">
          <img src={vizionLogo} alt="VizionX" className="h-6 w-6" />
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Settings
          </span>
        </div>
      </div>

      <div className="flex max-w-6xl mx-auto">
        {/* Sidebar */}
        <nav className="w-60 shrink-0 py-8 pr-6 pl-4 border-r border-white/5 min-h-[calc(100vh-57px)]">
          {sidebarSections.map((section) => (
            <div key={section.label} className="mb-6">
              <p className="text-[10px] font-bold tracking-widest text-cyan-400/70 mb-2 px-3">
                {section.label}
              </p>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeSection === item.id
                      ? 'bg-cyan-400/10 text-cyan-400 font-medium'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <item.icon size={15} />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 py-8 px-10">
          {activeSection === 'profile' && (
            <div className="space-y-10">
              {/* Picture and username */}
              <section>
                <h2 className="text-xl font-bold mb-6">Picture and username</h2>
                <div className="flex items-start gap-6 mb-6">
                  <Avatar className="h-16 w-16 ring-2 ring-cyan-400/20">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                    <AvatarFallback className="bg-cyan-400/10 text-cyan-400 text-lg font-bold">
                      {initials || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-white/40 mb-1">JPG, GIF, or PNG. Max 700KB, 4000px for any dimension.</p>
                    <Button variant="outline" size="sm" className="border-white/10 text-white/70 hover:text-white">
                      Upload photo
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Username</p>
                    <p className="text-sm font-medium">{form.username || name}</p>
                  </div>
                  <Button variant="outline" size="sm" className="border-white/10 text-white/70 hover:text-white ml-auto">
                    Change username
                  </Button>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-white/40 mb-1">Plan</p>
                  <span className={`text-sm font-semibold ${
                    plan === 'zenith' ? 'text-emerald-400' :
                    plan === 'elite' ? 'text-amber-400' :
                    plan === 'prime' ? 'text-cyan-400' : 'text-slate-400'
                  }`}>
                    {planLabels[plan] || plan}
                  </span>
                  <p className="text-[10px] text-cyan-400/60 mt-0.5 font-medium">Free for Beta Version</p>
                </div>
              </section>

              <Separator className="bg-white/5" />

              {/* Social and website links */}
              <section>
                <h2 className="text-xl font-bold mb-6">Social and website links</h2>
                <div className="space-y-4 max-w-lg">
                  {[
                    { key: 'x_profile', label: 'X profile', icon: Twitter, placeholder: '@username' },
                    { key: 'youtube_channel', label: 'YouTube channel', icon: Youtube, placeholder: 'youtube.com/@YourChannel' },
                    { key: 'facebook_profile', label: 'Facebook profile', icon: Facebook, placeholder: '@username' },
                    { key: 'instagram_profile', label: 'Instagram profile', icon: Instagram, placeholder: '@username' },
                    { key: 'website', label: 'Website', icon: Link2, placeholder: 'Website URL' },
                  ].map(({ key, label, icon: Icon, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs text-white/40 mb-1 block">{label}</label>
                      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                        <Icon size={16} className="text-white/30 shrink-0" />
                        <input
                          value={form[key as keyof typeof form]}
                          onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none flex-1"
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={handleSaveLinks}
                    disabled={updateProfile.isPending}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white"
                    size="sm"
                  >
                    <Save size={14} /> Save links
                  </Button>
                </div>
              </section>

              <Separator className="bg-white/5" />

              {/* Signature */}
              <section>
                <h2 className="text-xl font-bold mb-2">Signature on posts</h2>
                <p className="text-xs text-white/40 mb-4">Appears with your posts. You can add a short line and include a link.</p>
                <div className="max-w-lg">
                  <div className="relative">
                    <Textarea
                      value={form.signature}
                      onChange={(e) => {
                        if (e.target.value.length <= 254) setForm(f => ({ ...f, signature: e.target.value }));
                      }}
                      placeholder="Appears with your posts. You can add a short line and include a link."
                      className="bg-white/[0.02] border-white/10 text-white/80 placeholder:text-white/20 min-h-[80px] resize-none"
                    />
                    <span className="absolute bottom-2 right-3 text-[10px] text-white/30">
                      {form.signature.length}/254
                    </span>
                  </div>
                  <Button
                    onClick={handleSaveSignature}
                    disabled={updateProfile.isPending}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white mt-3"
                    size="sm"
                  >
                    <Save size={14} /> Save signature
                  </Button>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'account' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Account Settings</h2>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
                <p className="text-sm text-white/50 mb-3">Email</p>
                <p className="text-sm font-medium">{user?.email}</p>
              </div>
            </div>
          )}

          {activeSection === 'sessions' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Active sessions</h2>

              {sessionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
                  <p className="text-white/30 text-sm">No active sessions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s, i) => {
                    const DeviceIcon = getDeviceIcon(s.device);
                    const isFirst = i === 0;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="shrink-0 p-2 rounded-lg bg-white/[0.03]">
                          <DeviceIcon size={22} className="text-white/40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/90">
                            {s.device}{s.os !== 'Unknown' ? `, ${s.os}` : ''}
                          </p>
                          <p className="text-xs text-white/40 mt-0.5">
                            {formatSessionTime(s.updated_at)} · {s.ip}{s.browser !== 'Unknown' ? ` · ${s.browser}` : ''}
                          </p>
                        </div>
                        {isFirst ? (
                          <span className="text-xs font-semibold text-cyan-400 shrink-0">Active now</span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revokeSession(s.id)}
                            disabled={revokingId === s.id}
                            className="border-white/10 text-white/70 hover:text-white shrink-0"
                          >
                            {revokingId === s.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <LogOut size={14} />
                            )}
                            Log out
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeSection === 'subscriptions' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Subscriptions</h2>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
                <p className="text-sm text-white/50 mb-2">Current plan</p>
                <p className={`text-lg font-bold ${
                  plan === 'zenith' ? 'text-emerald-400' :
                  plan === 'elite' ? 'text-amber-400' :
                  plan === 'prime' ? 'text-cyan-400' : 'text-slate-400'
                }`}>
                  {planLabels[plan] || plan}
                </p>
                <p className="text-xs text-cyan-400/60 mt-1 font-medium">Free for Beta Version</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-white/10 text-white/70 hover:text-white"
                  onClick={() => navigate('/pricing')}
                >
                  Upgrade plan
                </Button>
              </div>
            </div>
          )}

          {['billing', 'notifications'].includes(activeSection) && (
            <div>
              <h2 className="text-xl font-bold mb-4">
                {activeSection === 'billing' ? 'Billing History' : 'Alerts Delivery'}
              </h2>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
                <p className="text-white/30 text-sm">Coming soon</p>
              </div>
            </div>
          )}

          {activeSection === 'support' && (
            <SupportSection user={user} />
          )}
        </main>
      </div>
    </div>
  );
}

function SupportSection({ user }: { user: any }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        user_id: user.id,
        user_email: user.email,
        subject: subject.trim(),
        message: message.trim(),
      });
      if (error) throw error;
      toast.success('Message sent! We will get back to you soon 🙏');
      setSubject('');
      setMessage('');
      setSent(true);
    } catch {
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Contact Support</h2>
      {sent ? (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-8 text-center">
          <p className="text-green-400 font-medium mb-2">Message sent successfully! ✅</p>
          <p className="text-white/40 text-sm">We will get back to you as soon as possible.</p>
          <button
            onClick={() => setSent(false)}
            className="mt-4 text-sm text-cyan-400 hover:underline"
          >
            Send another message
          </button>
        </div>
      ) : (
        <div className="max-w-lg space-y-4" dir="rtl">
          <div>
            <label className="text-xs text-white/40 mb-1 block">נושא</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="במה אפשר לעזור?"
              className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-white/80 placeholder:text-white/20 outline-none focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">הודעה</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="תאר את הבעיה או השאלה שלך..."
              rows={5}
              className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-white/80 placeholder:text-white/20 outline-none resize-none focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            שלח הודעה
          </Button>
        </div>
      )}
    </div>
  );
}
