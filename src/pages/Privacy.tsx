import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import InlineContactForm from '@/components/InlineContactForm';

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
          <p>We may share your personal data with third parties in the following circumstances:</p>

          <h3>Service Providers</h3>
          <p>
            We engage selected third parties who act on our behalf to support our operations, including: 
            (i) payment processing services, (ii) IT suppliers and hosting providers, (iii) web and mobile analytics providers, 
            (iv) digital advertising services, and (v) marketing and sales solution providers. 
            These parties may access, process, or store your data only under our instructions and solely to perform the services we have engaged them for.
          </p>

          <h3>Payment Information</h3>
          <p>
            When paid subscriptions become available, payment information (name, billing address, payment card or account details) 
            will be processed by our third-party payment processors. VizionX does not have direct access to your full payment card information. 
            We will use your email address to contact you regarding any billing issues.
          </p>

          <h3>Analytics Providers</h3>
          <p>
            We may use third-party analytics services to monitor and analyze usage of our platform and applications. 
            This helps us understand user behavior and improve our services. Analytics data is pseudonymous and does not include 
            personally identifiable profile information. Services we may use include:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li><strong>Google Analytics</strong> — web analytics for understanding traffic patterns and user engagement</li>
            <li><strong>Firebase</strong> — development and analytics platform by Google</li>
            <li><strong>Sentry</strong> — error tracking and performance monitoring to diagnose and fix issues</li>
          </ul>
          <p>Each provider operates under its own privacy policy, which we encourage you to review.</p>

          <h3>Business Transfers</h3>
          <p>
            In the event of a merger, acquisition, restructuring, or sale of assets, your personal data may be transferred 
            as part of that transaction. We will notify you of any such change in ownership or control.
          </p>

          <h3>Legal & Administrative Reasons</h3>
          <p>
            We may disclose personal data when required to: (i) comply with legal obligations, court orders, or regulatory proceedings; 
            (ii) enforce our Terms of Use or other agreements; or (iii) protect VizionX, its users, or others against loss, fraud, or damage. 
            This includes exchanging information with law enforcement, courts, or regulatory authorities.
          </p>

          <h3>Advertising</h3>
          <p>
            We may display advertising on our platform and use remarketing and tracking features to present relevant advertisements 
            based on user activity. We collect only pseudonymous data for these purposes. We do not share any personally identifiable 
            information with advertisers — they can only access aggregate statistics such as impression counts and click rates.
          </p>

          <h3>Security Services</h3>
          <p>
            We may use CAPTCHA and similar technologies to protect our services from spam, fraud, and automated abuse. 
            These services may analyze visitor behavior (e.g., IP address, visit duration, mouse interactions) in the background. 
            Data collected is forwarded to the respective service provider under their privacy policy.
          </p>

          <h2>Public Information on VizionX</h2>

          <h3>Public Profile</h3>
          <p>
            When you create a profile, other users may view your publicly available information, including: username, avatar, 
            signature, bio, social links, join date, subscription level, published analyses, and community status. 
            Your email address is never publicly visible unless you explicitly choose to display it.
          </p>

          <h3>Public Content</h3>
          <p>
            Our platform allows registered users to share charts, analyses, indicators, and other content publicly. 
            By publishing content, you grant us an irrevocable, perpetual, royalty-free license to display it along with your username. 
            You may also publish content as "private" — it will not appear on your profile or in search results, 
            but users with a direct link can still view it.
          </p>

          <h3>Messages & Communications</h3>
          <p>
            We store and process messages sent through our platform. We may scan links for malicious content and detect spam. 
            Recipients retain copies of messages even if you delete them from your account. Exercise caution when sharing sensitive information.
          </p>

          <h2>Data Security</h2>
          <p>
            We implement technical and organizational safeguards to protect your personal data, including TLS encryption, 
            firewalls, authentication systems, and access control mechanisms. Access to personal data is restricted to 
            authorized personnel who require it for their duties. Servers storing personal data are housed in secure, locked facilities.
          </p>
          <p>
            We continuously improve our security measures. However, no method of electronic transmission or storage is 100% secure, 
            and we cannot guarantee absolute security.
          </p>

          <h2>Children & Sensitive Data</h2>
          <p>
            VizionX is not directed at individuals under 18 years of age. We do not knowingly collect personal data from minors 
            or sensitive personal data (racial or ethnic origin, political opinions, religious beliefs, health data, biometric data, etc.) 
            as defined under GDPR Article 9. If you believe such data has been inadvertently collected, please contact us immediately.
          </p>

          <h2>Third-Party Sites</h2>
          <p>
            VizionX may contain links to external websites operated by third parties with independent privacy policies. 
            We bear no responsibility for their content, activities, or privacy practices. We recommend reviewing the privacy policy 
            of every site you visit.
          </p>

          <h2>EEA & UK Users' Rights</h2>
          <p>If you are located in the European Economic Area or the United Kingdom, you have the following rights:</p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li><strong>Access:</strong> Confirm whether we process your data and obtain a copy</li>
            <li><strong>Restriction:</strong> Request that we block or restrict processing in certain circumstances</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests; object to direct marketing at any time via the "unsubscribe" link</li>
            <li><strong>Withdrawal of Consent:</strong> Withdraw consent at any time without affecting prior lawful processing</li>
            <li><strong>Rectification:</strong> Correct inaccurate or incomplete data via your Settings page</li>
            <li><strong>Erasure:</strong> Request deletion of your personal data (see Account Deletion section)</li>
            <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format for reuse elsewhere</li>
            <li><strong>Complaint:</strong> Lodge a complaint with your local data protection authority (EU DPA contacts or the UK ICO)</li>
          </ul>

          <h2>California Users' Rights (CCPA)</h2>
          <p>If you are a California resident, the CCPA provides you with specific rights:</p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li><strong>Disclosure:</strong> Request information about the categories of personal data collected and disclosed in the past 12 months</li>
            <li><strong>Deletion:</strong> Request deletion of personal data we have collected from you</li>
            <li><strong>Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights</li>
          </ul>
          <p>We do not sell your personal information.</p>

          <h2>Data Retention</h2>
          <p>
            We retain personal data (1) until you request account deletion, or (2) as required by law or necessary for legitimate 
            business purposes (tax, legal, accounting, fraud prevention, etc.). Upon expiration of the retention period, 
            data is securely destroyed or anonymized. If you consent to marketing, we retain your data until you unsubscribe.
          </p>

          <h2>International Data Transfers</h2>
          <p>
            VizionX servers and service providers may be located in various countries, including outside the EEA. 
            We ensure appropriate safeguards are in place for international transfers in accordance with applicable data protection laws. 
            Contact us for more information about the safeguards we implement.
          </p>

          <h2>Contact Us</h2>
          <p>
            For questions, concerns, or requests related to this privacy policy or your personal data, please use the form below:
          </p>
          <InlineContactForm
            category="privacy"
            title="Privacy Inquiry"
            placeholder="Describe your privacy-related question or data request..."
            buttonLabel="Submit"
          />
          <p className="text-white/50">
            VizionX<br />
            Website: <a href="https://www.vizionx.pro" className="text-cyan-400 hover:underline">www.vizionx.pro</a>
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
