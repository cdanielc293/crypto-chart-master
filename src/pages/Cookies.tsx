import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import InlineContactForm from '@/components/InlineContactForm';

export default function Cookies() {
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
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Cookies Policy</h1>
        <p className="text-sm text-white/30 mb-10">Last updated: March 24, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/70 leading-relaxed [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-white/90 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-white/90">

          <p>
            This Cookies Policy ("Cookies Policy") describes the cookies and similar technologies that VizionX ("VizionX," "we," "us," or "our") 
            uses on its website at{' '}
            <a href="https://www.vizionx.pro" className="text-cyan-400 hover:underline">www.vizionx.pro</a>{' '}
            ("Site") and the choices available to you. This Cookies Policy forms part of VizionX's{' '}
            <span onClick={() => navigate('/privacy')} className="text-cyan-400 hover:underline cursor-pointer">Privacy Policy</span>. 
            When you first visit the Site, you may be asked to consent to the use of cookies in accordance with this policy. 
            By continuing to use the Site, you agree to our use of cookies as described herein.
          </p>

          <h2>What Is a Cookie?</h2>
          <p>
            A "cookie" is a small text file sent to your browser by a website you visit. Our Site uses both 
            <strong> first-party cookies</strong> (set by vizionx.pro) and <strong>third-party cookies</strong> (set by external domains), as described below.
          </p>
          <p>
            Cookies may be stored on your device for varying periods of time:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li><strong>Session cookies</strong> — temporary cookies that are automatically deleted when you close your browser</li>
            <li><strong>Persistent cookies</strong> — remain on your device until they expire or you manually delete them; used to recognize your device on subsequent visits</li>
          </ul>
          <p>
            Data collected through cookies may include: your device's IP address, browser type, language, operating system, 
            country of access, date and time of visits, pages viewed, links clicked, features used, search queries, and saved preferences. 
            VizionX uses this information for user authentication, interface customization, security, analytics, 
            and service improvement. For details on how we use your data, see our{' '}
            <span onClick={() => navigate('/privacy')} className="text-cyan-400 hover:underline cursor-pointer">Privacy Policy</span>.
          </p>

          <h2>How We Use Cookies</h2>

          <h3>Necessary Cookies</h3>
          <p>
            These cookies are essential for the Site to function. They enable core features such as user authentication, 
            secure area access, language preferences, and form submissions. Without these cookies, basic Site functionality 
            would not be available. Because they are strictly necessary, they cannot be disabled.
          </p>

          <h3>Performance & Analytics Cookies</h3>
          <p>
            These cookies help us understand how visitors interact with the Site by collecting anonymized data about 
            page views, navigation patterns, time spent on pages, and conversion events. This information allows us 
            to identify usability issues and improve the overall user experience. These cookies do not collect 
            personally identifiable information.
          </p>

          <h3>Advertising Cookies</h3>
          <p>
            When applicable, advertising cookies may be used to display relevant advertisements based on your interests 
            and browsing behavior. These cookies track ad impressions, clicks, and conversions. We do not share personally 
            identifiable information with advertisers — they receive only aggregate statistics.
          </p>

          <h3>Third-Party Integration Cookies</h3>
          <p>
            Certain cookies are placed by third-party services integrated into our Site, such as embedded content, 
            analytics tools, or social features. These third parties may set their own cookies, and VizionX has no control 
            over them. You can manage third-party cookies through your browser settings.
          </p>

          <h2>Cookies We Use</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-white/10 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left p-3 text-white/80 font-semibold">Provider</th>
                  <th className="text-left p-3 text-white/80 font-semibold">Type</th>
                  <th className="text-left p-3 text-white/80 font-semibold">Domain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr><td className="p-3">VizionX</td><td className="p-3">Necessary cookies</td><td className="p-3 text-white/40">.vizionx.pro</td></tr>
                <tr><td className="p-3">Google Analytics</td><td className="p-3">Performance & analytics</td><td className="p-3 text-white/40">.vizionx.pro</td></tr>
                <tr><td className="p-3">Google Advertising</td><td className="p-3">Ad cookies</td><td className="p-3 text-white/40">.vizionx.pro</td></tr>
              </tbody>
            </table>
          </div>

          <h2>Web Beacons & Tracking Pixels</h2>
          <p>
            We may use web beacons (also known as tracking pixels) — tiny transparent graphics with unique identifiers — 
            to track usage patterns, count visitors to specific pages, measure advertising effectiveness, and analyze user behavior. 
            Web beacons do not carry personal data and are used solely to monitor Site performance and display relevant content. 
            Information generated by web beacons may be used in conjunction with analytics services to create usage reports 
            and improve our services.
          </p>

          <h2>Managing Your Cookie Preferences</h2>
          <p>
            Most web browsers allow you to control cookies through their settings. You can typically find these options 
            in your browser's "Settings," "Preferences," or "Privacy" menu. Below are links to cookie management instructions 
            for popular browsers:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Mozilla Firefox</a></li>
            <li><a href="https://support.microsoft.com/en-us/microsoft-edge/manage-cookies-in-microsoft-edge-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Microsoft Edge</a></li>
            <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Safari (macOS)</a></li>
            <li><a href="https://support.apple.com/en-us/HT201265" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Safari (iOS)</a></li>
          </ul>
          <p>
            For other browsers, consult the documentation provided by your browser's developer. 
            Please note that disabling certain cookies may affect the functionality of the Site.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Cookies Policy at any time by posting the revised version on our Site. 
            Unless additional notice or consent is required by applicable law, the updated policy will serve as your notification of changes. 
            We encourage you to review this page periodically.
          </p>

          <h2>Contact Us</h2>
          <p>If you have questions about our use of cookies, please reach out:</p>
          <InlineContactForm
            category="privacy"
            title="Cookie & Privacy Inquiry"
            placeholder="Describe your question about cookies or privacy..."
            buttonLabel="Submit"
          />

          <div className="border-t border-white/10 pt-8 mt-12">
            <p className="text-xs text-white/30 text-center">
              © {new Date().getFullYear()} VizionX. All rights reserved. | www.vizionx.pro
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
