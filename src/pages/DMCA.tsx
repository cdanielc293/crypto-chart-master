import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import InlineContactForm from '@/components/InlineContactForm';

export default function DMCA() {
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
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">DMCA & Copyright Policy</h1>
        <p className="text-sm text-white/30 mb-10">Last updated: March 24, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/70 leading-relaxed [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-white/90 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-white/90">

          <p>
            VizionX respects the intellectual property rights of others and expects its users to do the same. 
            In accordance with the Digital Millennium Copyright Act of 1998 ("DMCA") and other applicable intellectual property laws, 
            VizionX will respond to notices of alleged copyright infringement that comply with the DMCA and are properly submitted.
          </p>

          <h2>Reporting Copyright Infringement</h2>
          <p>
            If you believe that content hosted on or accessible through VizionX infringes your copyright, 
            you may submit a DMCA takedown notice containing the following information:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li>A physical or electronic signature of the copyright owner or a person authorized to act on their behalf</li>
            <li>Identification of the copyrighted work claimed to have been infringed</li>
            <li>Identification of the material that is claimed to be infringing and information reasonably sufficient to locate it on our platform</li>
            <li>Your contact information, including name, address, telephone number, and email address</li>
            <li>A statement that you have a good faith belief that the use of the material is not authorized by the copyright owner, its agent, or the law</li>
            <li>A statement, made under penalty of perjury, that the information in the notification is accurate and that you are authorized to act on behalf of the copyright owner</li>
          </ul>

          <p>Submit DMCA notices through the form below:</p>
          <InlineContactForm
            category="dmca"
            title="Submit a DMCA Notice"
            placeholder="Include all required information listed above..."
            buttonLabel="Submit DMCA Notice"
          />

          <h2>Counter-Notification</h2>
          <p>
            If you believe that content you posted was removed or disabled as a result of a mistake or misidentification, 
            you may submit a counter-notification containing:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li>Your physical or electronic signature</li>
            <li>Identification of the material that was removed and the location where it appeared before removal</li>
            <li>A statement under penalty of perjury that you have a good faith belief the material was removed as a result of mistake or misidentification</li>
            <li>Your name, address, telephone number, and a statement consenting to the jurisdiction of the federal court in your district</li>
          </ul>

          <h2>Repeat Infringers</h2>
          <p>
            VizionX will, in appropriate circumstances, disable and/or terminate the accounts of users who are repeat infringers. 
            A repeat infringer is any user who has been the subject of more than two valid DMCA takedown notices.
          </p>

          <h2>Good Faith</h2>
          <p>
            Please note that misrepresentations in a DMCA notice or counter-notification may result in legal liability. 
            You should consult with a legal professional before filing a notice if you are unsure whether your rights have been infringed 
            or whether the material constitutes infringement.
          </p>

          <div className="border-t border-white/10 pt-8 mt-12">
            <p className="text-xs text-white/30 text-center">© {new Date().getFullYear()} VizionX. All rights reserved. | www.vizionx.pro</p>
          </div>
        </div>
      </div>
    </div>
  );
}
