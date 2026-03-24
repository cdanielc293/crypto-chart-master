import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bug, Globe, Smartphone, BarChart3, Monitor, AlertTriangle, ShieldCheck, ShieldAlert, Shield, ShieldOff } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import InlineContactForm from '@/components/InlineContactForm';
import vizionLogo from '@/assets/vizionx-logo.png';

const coverageAreas = [
  { icon: Globe, title: 'Website', desc: 'Vulnerabilities on vizionx.pro and its subdomains.' },
  { icon: Smartphone, title: 'Mobile Apps', desc: 'Issues on iOS and Android platforms.' },
  { icon: BarChart3, title: 'Charting Tools', desc: 'Errors in charts, drawing tools, indicators, or APIs.' },
  { icon: Monitor, title: 'Desktop App', desc: 'Bugs or performance issues in the desktop application.' },
];

const rewardLevels = [
  { level: 'Critical', color: 'text-red-400 border-red-500/30 bg-red-500/5', icon: AlertTriangle, desc: 'Vulnerabilities that affect the entire service or all users.' },
  { level: 'High', color: 'text-orange-400 border-orange-500/30 bg-orange-500/5', icon: ShieldAlert, desc: 'Vulnerabilities that don\'t require user interaction but affect many users.' },
  { level: 'Medium', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5', icon: Shield, desc: 'Vulnerabilities that require user interaction or affect individual users.' },
  { level: 'Low', color: 'text-blue-400 border-blue-500/30 bg-blue-500/5', icon: ShieldOff, desc: 'Vulnerabilities with limited security impact and no direct effect on users.' },
];

const outOfScope = [
  'Vulnerabilities in user software or requiring full access to user accounts, email, or phone',
  'Vulnerabilities or leaks in third-party services',
  'Outdated third-party software/protocols or deviations from best practices without a security threat',
  'Vulnerabilities with no substantial security impact or exploitation possibility',
  'Vulnerabilities requiring unusual user actions',
  'Disclosure of public or non-sensitive information',
  'Homograph attacks',
  'Vulnerabilities requiring rooted, jailbroken, or modified devices',
  'Any activity that could disrupt our services',
  'EXIF geolocation data not stripped',
  'Clickjacking on pages with no sensitive actions',
  'CSRF on unauthenticated forms or forms without sensitive actions, logout CSRF',
  'Weak ciphers or TLS configuration without a working proof of concept',
  'Content spoofing or injection without a demonstrable attack vector',
  'Rate limiting or brute force on non-authentication endpoints',
  'Missing HttpOnly or Secure flags on cookies',
  'Software version disclosure, banner identification, descriptive error messages',
  'Public zero-day vulnerabilities with an official patch less than 1 month old (case by case)',
  'Tabnabbing',
  'User, email, or phone number enumeration',
  'Lack of password complexity restrictions',
];

export default function BugBounty() {
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
            <Bug className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Bug Bounty Program</h1>
          <p className="text-white/50 max-w-xl mx-auto mb-6">
            Found a vulnerability on our platform? Help us keep VizionX secure and get rewarded.
          </p>
          <InlineContactForm
            category="bug-bounty"
            title="Submit a Security Report"
            placeholder="Describe the vulnerability, include reproduction steps or a proof-of-concept..."
            buttonLabel="Send Report"
          />
        </div>

        <div className="space-y-16">
          {/* About */}
          <section>
            <h2 className="text-xl font-bold text-white mb-2">About the Program</h2>
            <p className="text-white/50 mb-6 text-sm">
              Earn rewards for helping us improve VizionX. Reports can cover security vulnerabilities in our services, infrastructure, and applications.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {coverageAreas.map((area) => (
                <div key={area.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
                  <area.icon className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <h3 className="font-semibold text-white text-sm mb-1">{area.title}</h3>
                  <p className="text-[11px] text-white/40">{area.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Reward Levels */}
          <section>
            <h2 className="text-xl font-bold text-white mb-2">Reward Levels</h2>
            <p className="text-white/50 mb-6 text-sm">
              Your reward depends on the type of vulnerability reported and its overall security impact.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {rewardLevels.map((r) => (
                <div key={r.level} className={`rounded-xl border p-5 ${r.color}`}>
                  <r.icon className="w-5 h-5 mb-2" />
                  <h3 className="font-bold text-sm mb-1">{r.level}</h3>
                  <p className="text-xs opacity-70">{r.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/40">
              Reward amounts may vary based on severity, exploitability, genuineness, environment, and other factors. 
              Vulnerabilities in non-production environments (beta, staging, demo) are rewarded only when they affect 
              the service as a whole or may cause sensitive data leakage.
            </p>
          </section>

          {/* Rules */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Program Rules</h2>
            <div className="space-y-3">
              {[
                'Reports must include a detailed description of the vulnerability and reproducible steps or a working proof-of-concept. Incomplete reports may be delayed or rejected.',
                'Submit one vulnerability per report, unless chaining vulnerabilities is needed to demonstrate impact.',
                'Only the first person to report an unknown vulnerability is eligible for a reward. Duplicate reports receive no reward.',
                'Do not use automated scanning tools or vulnerability scanners. Such reports will be disregarded.',
                'Do not perform any attack that could damage our services or user data. DDoS, spam, and brute force attacks disqualify reports from rewards.',
                'Do not involve other users without their explicit consent. Use only private content during testing.',
                'Do not attempt non-technical attacks such as social engineering (phishing, vishing, smishing) or physical attacks against employees, users, or infrastructure.',
                'Multiple vulnerabilities stemming from a single underlying issue will receive one bounty.',
                'Make a good faith effort to avoid privacy violations, data destruction, and service disruption.',
              ].map((rule, i) => (
                <div key={i} className="flex gap-3 text-sm text-white/60">
                  <span className="text-cyan-400 font-mono text-xs mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <p>{rule}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Out of Scope */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Out of Scope</h2>
            <p className="text-white/50 mb-4 text-sm">The following issues are not eligible for rewards:</p>
            <ul className="space-y-1.5">
              {outOfScope.map((item, i) => (
                <li key={i} className="flex gap-2 text-xs text-white/50">
                  <span className="text-white/20 shrink-0">×</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* CTA */}
          <section className="text-center py-8 border-t border-white/10">
            <h2 className="text-lg font-bold text-white mb-2">Ready to Report?</h2>
            <p className="text-sm text-white/50 mb-4">
              Send your findings to our security team. Include all relevant details and reproduction steps.
            </p>
            <a
              href="mailto:security@vizionx.pro"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Submit a Security Report
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
