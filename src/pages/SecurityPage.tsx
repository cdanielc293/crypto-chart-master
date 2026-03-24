import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, KeyRound, AlertTriangle, Wifi, Smartphone, Mail, Globe, ExternalLink } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import InlineContactForm from '@/components/InlineContactForm';
import vizionLogo from '@/assets/vizionx-logo.png';

export default function Security() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050508] text-white/80">
      <nav className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-[#050508]/80 border-b border-white/5">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <img src={vizionLogo} alt="VizionX" className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">VIZIONX</span>
        </div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-6">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Staying Safe on VizionX</h1>
          <p className="text-white/50 max-w-xl mx-auto">
            Protect yourself — learn how to avoid scams, secure your information, and stay one step ahead of online threats.
          </p>
        </div>

        <div className="space-y-16">
          {/* Account Protection */}
          <section>
            <h2 className="text-xl font-bold text-white mb-2">How to Protect Your Account</h2>
            <p className="text-white/50 mb-6 text-sm">Must-dos for protecting your account, avoiding scams, and keeping your data safe online.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <Lock className="w-5 h-5 text-cyan-400 mb-3" />
                <h3 className="font-semibold text-white mb-1">Enable Two-Factor Authentication</h3>
                <p className="text-sm text-white/50">2FA adds an extra verification step beyond your password, making your account significantly harder to compromise.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <KeyRound className="w-5 h-5 text-cyan-400 mb-3" />
                <h3 className="font-semibold text-white mb-1">Use Strong, Unique Passwords</h3>
                <p className="text-sm text-white/50">Create a complex password you don't use anywhere else. Consider using a password manager.</p>
              </div>
            </div>
          </section>

          {/* Cybersecurity Tips */}
          <section>
            <h2 className="text-xl font-bold text-white mb-2">Cybersecurity Essentials</h2>
            <p className="text-white/50 mb-6 text-sm">Safeguard your data and avoid scams with these quick tips.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: AlertTriangle, title: 'Watch Out for Phishing', desc: 'Ignore suspicious links or messages. VizionX will never ask for your password, 2FA codes, or sensitive information via email or chat.' },
                { icon: Globe, title: 'Trust Only Official Channels', desc: 'Legitimate information comes only from vizionx.pro. If something seems off — verify before acting.' },
                { icon: Smartphone, title: 'Use Only Official Apps', desc: 'Access VizionX only through our official website. Never download apps from unofficial sources.' },
                { icon: Shield, title: 'Keep Devices Secure', desc: 'Use up-to-date antivirus software and keep your operating system and browser current.' },
                { icon: Wifi, title: 'Avoid Public Wi-Fi for Trading', desc: 'Public networks can be compromised. Only access your account on secure, private connections.' },
                { icon: Mail, title: 'Stay Informed About Scams', desc: 'New scam techniques emerge regularly. Stay updated on the latest security advisories.' },
              ].map((tip) => (
                <div key={tip.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <tip.icon className="w-5 h-5 text-cyan-400 mb-3" />
                  <h3 className="font-semibold text-white text-sm mb-1">{tip.title}</h3>
                  <p className="text-xs text-white/50">{tip.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Scams to Watch */}
          <section>
            <h2 className="text-xl font-bold text-white mb-2">Scams & Threats to Watch Out For</h2>
            <p className="text-white/50 mb-6 text-sm">
              Scammers don't announce themselves. Even strong security can't protect you if you click the wrong link — so learn to recognize the tricks.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Fake "Free Premium" Offers', desc: 'There\'s no free premium access. All legitimate promotions are listed on our official Pricing page.' },
                { title: 'Counterfeit VizionX Apps', desc: 'Unofficial or "cracked" versions of VizionX may contain malware. Only use our official website.' },
                { title: 'False Beta Invitations', desc: 'VizionX does not distribute secret beta access through social media comments or private messages.' },
                { title: 'Fake Social Media Accounts', desc: 'Trust only our verified accounts. Impersonators often use similar-looking names to deceive users.' },
                { title: 'Account Hacking Attempts', desc: 'No legitimate representative will ever ask for your password, CVV, ID, or authentication codes.' },
                { title: 'Support Impersonators', desc: 'Our support team will never contact you through third-party messengers. All support is handled through our official channels.' },
                { title: 'Phishing Websites', desc: 'Always verify the URL. The only legitimate VizionX website is vizionx.pro.' },
                { title: 'Fraudulent Emails', desc: 'All official emails come from @vizionx.pro addresses. When in doubt — don\'t click any links.' },
                { title: 'Scam Calls & Messages', desc: 'VizionX will never call you or message you requesting personal information. If someone claims to be from VizionX — hang up.' },
              ].map((scam) => (
                <div key={scam.title} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                  <h3 className="font-semibold text-white text-sm mb-1">{scam.title}</h3>
                  <p className="text-xs text-white/50">{scam.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Official Channels */}
          <section>
            <h2 className="text-xl font-bold text-white mb-2">Our Official Channels</h2>
            <p className="text-white/50 mb-6 text-sm">
              When in doubt, verify through our official accounts listed below. These are the only legitimate VizionX channels.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <a
                href="https://www.vizionx.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:border-cyan-500/30 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">Website</p>
                  <p className="text-[11px] text-white/40">vizionx.pro</p>
                </div>
              </a>
            </div>
          </section>

          {/* What If Scammed */}
          <section>
            <h2 className="text-xl font-bold text-white mb-2">What If You've Been Targeted</h2>
            <p className="text-white/50 mb-6 text-sm">
              Got scammed? Don't panic. Take immediate action to protect yourself.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                <Lock className="w-5 h-5 text-cyan-400 mb-3" />
                <h3 className="font-semibold text-white mb-1">Account Compromised?</h3>
                <p className="text-sm text-white/50 mb-3">
                  Change your password immediately and enable 2FA. Use the form below to report the issue — we'll help you recover access.
                </p>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                <AlertTriangle className="w-5 h-5 text-amber-400 mb-3" />
                <h3 className="font-semibold text-white mb-1">Lost Money or Data?</h3>
                <p className="text-sm text-white/50">
                  Report the incident to relevant authorities in your jurisdiction. 
                  Sharing details can help prevent further harm to others. Document everything for your records.
                </p>
              </div>
            </div>
          </section>

          {/* Report */}
          <section className="text-center py-8 border-t border-white/10">
            <h2 className="text-lg font-bold text-white mb-2">Report a Security Concern</h2>
            <p className="text-sm text-white/50 mb-4">
              Found a vulnerability or security issue? Help us keep VizionX safe for everyone.
            </p>
            <a
              href="mailto:security@vizionx.pro"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Send a Security Report
            </a>
          </section>

          <div className="border-t border-white/10 pt-8">
            <p className="text-xs text-white/30 text-center">
              © {new Date().getFullYear()} VizionX. All rights reserved. | www.vizionx.pro
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
