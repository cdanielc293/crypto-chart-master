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
import vizionLogo from '@/assets/vizion-logo.png';
import {
  ArrowLeft, User, Shield, CreditCard, Receipt, Bell, Globe, Youtube, Instagram, Twitter,
  Facebook, Link2, Save, Monitor, Smartphone, Tablet, Laptop, LogOut, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
          <img src={vizionLogo} alt="Vizion" className="h-6 w-6" />
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
        </main>
      </div>
    </div>
  );
}
