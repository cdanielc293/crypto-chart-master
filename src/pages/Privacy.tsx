import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';

export default function Privacy() {
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
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-white/30 mb-10">Last updated: March 24, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/70 leading-relaxed [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-white/90 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-white/90">

          <p>
            We are VizionX ("VizionX," "we," or "us"). We respect your privacy and are committed to protecting the confidentiality 
            of the information you share with us. We will only share your personal data with third parties when necessary to provide 
            the services and features you have requested, as described in this privacy policy.
          </p>

          <h2>About Us</h2>
          <p>
            VizionX is the data controller responsible for your personal data and is the owner of the{' '}
            <a href="https://www.vizionx.pro" className="text-cyan-400 hover:underline">www.vizionx.pro</a> website ("Website"), 
            VizionX applications, and all associated services (each, a "Service"). This privacy policy applies to personal data 
            we collect when you visit the Website, create an account, or use our services. It explains what data we collect, 
            why we collect it, how we use and store it, and when we may share it.
          </p>
          <p>
            As used herein, "personal data" means any information that identifies or can be used to identify you.
          </p>
          <p>
            By using our Services or submitting personal data, you agree to the terms of this privacy policy. 
            If you disagree at any point, you should discontinue use of our Services and delete your account.
          </p>

          <h2>Updates to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. The current version will always be available on our Website. 
            If significant changes are made, we will notify you as required by applicable law.
          </p>

          <h2>Personal Data We Collect</h2>
          <p>
            You may browse publicly available market data, charts, and information on VizionX without creating an account. 
            When you create an account or use certain features, we collect data as described below.
          </p>

          <h3>Data You Provide to Us</h3>
          <p><strong>Account Registration.</strong> To create an account, you must provide:</p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li>A username and email address; or</li>
            <li>Account credentials from a supported social login provider (e.g., Google, Apple, GitHub)</li>
          </ul>
          <p>
            If you purchase a subscription (when available), we will also need your name and billing address. 
            You may optionally add additional profile information (bio, social links, avatar), but this is not required.
          </p>

          <p><strong>Publicly Displayed Information:</strong> Username, avatar, signature, bio, social media links, join date, and subscription level.</p>
          <p><strong>Private Information (not publicly displayed):</strong> Your name, phone number, and email address.</p>

          <p><strong>Contact Data.</strong> We process personal data you provide when contacting us via email, support tickets, or other communication channels.</p>

          <h3>Data We Collect Automatically</h3>

          <p><strong>Cookies & Similar Technologies.</strong> We use cookies (small text files stored on your device) to operate our platform, 
          gather analytics, ensure security, and improve your experience. For more details, see our Cookie Policy.</p>

          <p><strong>Log Files.</strong> Like most web services, we collect server log data including IP addresses, browser type, 
          referring/exit pages, platform type, and timestamps. This data is used for site administration, traffic analysis, 
          and enforcing our Terms of Use. IP addresses in log files are not linked to personal profile data.</p>

          <p><strong>Device Information.</strong> We collect device IP address (and inferred country), device type, operating system, 
          and browser version. This information helps prevent spam and abuse.</p>

          <p><strong>Analytics.</strong> When you use VizionX, we may automatically collect pseudonymous analytics data including 
          general device information, device identifiers, network information, and interaction events. 
          This data does not include personally identifiable profile information and is used solely to analyze and improve our services.</p>

          <h3>Data from Third Parties</h3>
          <p>
            When you sign in using a third-party service (e.g., Google, Apple), that service sends us your username and associated email address. 
            We do not control how third parties handle your data and bear no responsibility for their data practices.
          </p>

          <h2>How We Use Your Personal Data</h2>
          <p>We use your personal data for the following purposes:</p>

          <h3>Account & Profile</h3>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li>Authenticate your account and ensure security</li>
            <li>Manage your account settings and preferences</li>
            <li>Send account verification and welcome emails</li>
            <li>Provide subscription services and process billing (for paid users)</li>
            <li>Customize your experience (chart settings, layouts, preferences)</li>
          </ul>
          <p>Private profile settings are never shared with third parties.</p>

          <h3>Communications</h3>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li><strong>Marketing:</strong> We may send marketing emails about similar products or services. You can unsubscribe at any time.</li>
            <li><strong>Social Notifications:</strong> Emails about followers, likes, and activity from users you follow. Adjustable in Settings.</li>
            <li><strong>Service Announcements:</strong> Essential communications about service interruptions, major updates, or security notices.</li>
            <li><strong>Customer Support:</strong> When you contact support, we use your information and any provided materials to resolve your issue.</li>
          </ul>

          <h3>Legitimate Interests</h3>
          <p>We process personal data as necessary for legitimate business interests, including:</p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li>Responding to inquiries, feedback, and complaints</li>
            <li>Administering and improving our services and understanding user interaction patterns</li>
            <li>Developing and improving our applications</li>
            <li>Internal business operations: troubleshooting, data analysis, testing, research, and security</li>
            <li>Sending relevant product information tailored to your interests (with opt-out available)</li>
            <li>Anonymizing and aggregating data for statistical analysis, market research, and business development</li>
            <li>Complying with legal obligations, responding to lawful requests from authorities, enforcing our Terms, and protecting rights, safety, and property</li>
          </ul>
          <p>
            When processing data based on legitimate interests, we balance any potential impact on you and your rights. 
            Our interests do not automatically override yours. You have the right to object to processing based on legitimate interests 
            at any time, on grounds relating to your particular situation.
          </p>

          <h2>Account Deletion</h2>
          <p>
            You may request account deletion through your Settings page. Your account will be scheduled for deletion after 30 days, 
            during which you may cancel the process. Upon deletion, personal data you provided will be removed. 
            However, certain data (published analyses, messages sent to other users) that has been integrated into the platform 
            will be retained to maintain system integrity.
          </p>
          <p>
            For legal compliance (including tax laws, audits, and security), we retain certain records — including transaction logs, 
            financial records, and related data — for up to 10 years as required by law.
          </p>
          <p>
            Please note that search engines and third parties may retain cached copies of publicly available information 
            even after account deletion.
          </p>

          <h2>When We Share Your Personal Data</h2>
          <p>We may share your personal data in the following circumstances:</p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li><strong>Payment Processors:</strong> When you make a purchase, payment information is processed by our third-party payment provider. We do not store full payment card details.</li>
            <li><strong>Service Providers:</strong> We work with trusted third-party providers for analytics, infrastructure, security, and customer support. They process data on our behalf under strict confidentiality agreements.</li>
            <li><strong>Legal Requirements:</strong> We may disclose data to law enforcement, regulators, or courts when required by law, subpoena, or legal process.</li>
            <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred as part of that transaction.</li>
            <li><strong>Affiliated Entities:</strong> We may share data with affiliated businesses for administrative purposes and service provision.</li>
          </ul>

          <h2>Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, 
            alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage 
            is 100% secure, and we cannot guarantee absolute security.
          </p>

          <h2>Data Retention</h2>
          <p>
            We retain personal data only for as long as necessary to fulfill the purposes described in this policy, 
            unless a longer retention period is required by law. When data is no longer needed, it is securely deleted or anonymized.
          </p>

          <h2>International Data Transfers</h2>
          <p>
            Your data may be transferred to and processed in countries outside your country of residence. 
            We ensure appropriate safeguards are in place for such transfers in accordance with applicable data protection laws.
          </p>

          <h2>Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data</li>
            <li><strong>Erasure:</strong> Request deletion of your personal data (subject to legal obligations)</li>
            <li><strong>Restriction:</strong> Request that we limit processing of your data in certain circumstances</li>
            <li><strong>Portability:</strong> Request your data in a structured, machine-readable format</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests or for direct marketing</li>
            <li><strong>Withdraw Consent:</strong> Where processing is based on consent, you may withdraw it at any time</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:privacy@vizionx.pro" className="text-cyan-400 hover:underline">privacy@vizionx.pro</a>. 
            We will respond within the timeframe required by applicable law.
          </p>

          <h2>Children's Privacy</h2>
          <p>
            VizionX is not intended for use by individuals under the age of 18. We do not knowingly collect personal data 
            from children. If we become aware that we have collected data from a minor, we will take steps to delete it promptly.
          </p>

          <h2>Third-Party Links</h2>
          <p>
            Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices 
            of those third parties. We encourage you to review the privacy policies of any external sites you visit.
          </p>

          <h2>Contact Us</h2>
          <p>
            For questions, concerns, or requests related to this privacy policy, please contact us at:{' '}
            <a href="mailto:privacy@vizionx.pro" className="text-cyan-400 hover:underline">privacy@vizionx.pro</a>
          </p>

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
