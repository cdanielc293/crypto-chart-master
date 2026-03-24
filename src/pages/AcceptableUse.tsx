import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import InlineContactForm from '@/components/InlineContactForm';

export default function AcceptableUse() {
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
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Acceptable Use Policy</h1>
        <p className="text-sm text-white/30 mb-10">Last updated: March 24, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/70 leading-relaxed [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-12 [&_h2]:mb-4 [&_strong]:text-white/90">

          <p>
            This Acceptable Use Policy ("AUP") governs your use of VizionX and all associated services. 
            By accessing or using VizionX, you agree to comply with this AUP. Violations may result in 
            suspension or termination of your account without notice.
          </p>

          <h2>Prohibited Activities</h2>
          <p>You agree not to engage in any of the following activities:</p>

          <ul className="list-disc pl-6 space-y-2 text-white/60">
            <li><strong>Illegal Activity:</strong> Using VizionX for any purpose that violates applicable local, state, national, or international laws or regulations</li>
            <li><strong>Market Manipulation:</strong> Posting or distributing content intended to manipulate financial markets, including pump-and-dump schemes, spoofing, or coordinated trading to artificially influence prices</li>
            <li><strong>Harassment & Abuse:</strong> Harassing, threatening, intimidating, or bullying other users; posting hateful, discriminatory, or violent content</li>
            <li><strong>Spam & Solicitation:</strong> Sending unsolicited promotional content, chain letters, bulk messaging, or unauthorized advertising</li>
            <li><strong>Impersonation:</strong> Impersonating any person or entity, including VizionX staff, or falsely representing your affiliation with any person or entity</li>
            <li><strong>Data Scraping:</strong> Using automated tools, bots, scrapers, or crawlers to collect data from VizionX without explicit written permission</li>
            <li><strong>Reverse Engineering:</strong> Decompiling, disassembling, reverse engineering, or attempting to derive source code from VizionX software</li>
            <li><strong>Security Violations:</strong> Attempting to probe, scan, or test the vulnerability of our systems without authorization; circumventing authentication or security measures</li>
            <li><strong>Excessive Resource Use:</strong> Using VizionX in a manner that places disproportionate load on our infrastructure or interferes with other users' access</li>
            <li><strong>Malicious Content:</strong> Uploading, transmitting, or distributing viruses, malware, trojans, worms, or any other malicious code</li>
            <li><strong>False Information:</strong> Knowingly providing false, misleading, or fraudulent information in your account profile, published content, or communications</li>
            <li><strong>Unauthorized Access:</strong> Accessing or attempting to access another user's account, data, or private content without authorization</li>
            <li><strong>Resale:</strong> Reselling, sublicensing, or commercially redistributing VizionX services, data, or content without explicit written authorization</li>
          </ul>

          <h2>Content Standards</h2>
          <p>All content published on VizionX must:</p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li>Be relevant to financial markets, trading, or technical analysis</li>
            <li>Not contain personally identifiable information of third parties without their consent</li>
            <li>Not infringe upon any third-party intellectual property rights</li>
            <li>Not promote illegal activities, financial fraud, or unregistered securities</li>
            <li>Comply with all applicable laws and regulations</li>
          </ul>

          <h2>Enforcement</h2>
          <p>
            VizionX reserves the right to investigate violations of this AUP and take appropriate action, including:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li>Issuing warnings</li>
            <li>Removing or disabling content</li>
            <li>Temporarily or permanently suspending accounts</li>
            <li>Reporting violations to law enforcement authorities</li>
            <li>Pursuing legal remedies for damages</li>
          </ul>
          <p>
            Paid subscriptions do not exempt users from enforcement actions. No refunds will be issued for accounts terminated due to AUP violations.
          </p>

          <h2>Reporting Violations</h2>
          <p>
            If you encounter content or behavior that violates this AUP, please report it to{' '}
            <a href="mailto:abuse@vizionx.pro" className="text-cyan-400 hover:underline">abuse@vizionx.pro</a>.
          </p>

          <div className="border-t border-white/10 pt-8 mt-12">
            <p className="text-xs text-white/30 text-center">© {new Date().getFullYear()} VizionX. All rights reserved. | www.vizionx.pro</p>
          </div>
        </div>
      </div>
    </div>
  );
}
