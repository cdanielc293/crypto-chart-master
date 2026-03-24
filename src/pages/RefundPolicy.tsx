import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';

export default function RefundPolicy() {
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
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Refund & Cancellation Policy</h1>
        <p className="text-sm text-white/30 mb-10">Last updated: March 24, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/70 leading-relaxed [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-12 [&_h2]:mb-4 [&_strong]:text-white/90">

          <p className="text-xs text-white/40 border border-white/10 rounded-lg p-4 bg-white/[0.02]">
            <strong className="text-white/60">Note:</strong> VizionX is currently in Beta. All features are provided free of charge during this period. 
            This Refund & Cancellation Policy will take full effect when paid subscriptions are introduced.
          </p>

          <h2>Free Trial</h2>
          <p>
            When paid plans become available, VizionX may offer a free trial period for select plans. 
            If you do not cancel before the trial expires, your subscription will automatically convert to a paid plan 
            based on the billing cycle you selected (monthly or annual). You are solely responsible for cancelling 
            before the trial period ends if you do not wish to be charged.
          </p>

          <h2>Subscription Billing</h2>
          <p>
            All subscriptions are billed in advance on a recurring basis (monthly or annually). 
            By subscribing, you authorize VizionX to charge your selected payment method according to the billing cycle. 
            Billing will continue until you cancel your subscription.
          </p>

          <h2>Cancellation</h2>
          <p>
            You may cancel your subscription at any time through your account Settings page. 
            Upon cancellation, your subscription remains active until the end of the current billing period. 
            No further charges will be applied after cancellation takes effect.
          </p>
          <p>
            <strong>Email or support ticket requests alone do not constitute a valid cancellation.</strong> 
            You must cancel through the designated cancellation mechanism in your account settings.
          </p>

          <h2>Refund Eligibility</h2>
          <ul className="list-disc pl-6 space-y-2 text-white/60">
            <li><strong>Annual Plans:</strong> Refunds are available if requested within 14 calendar days of the payment date. Contact our support team to request a refund.</li>
            <li><strong>Monthly Plans:</strong> No refunds are provided for monthly subscriptions, even if cancelled on the same day as payment.</li>
            <li><strong>Plan Upgrades:</strong> No refunds are provided for upgrades to a higher-tier plan.</li>
            <li><strong>Market Data Add-ons:</strong> No refunds are provided for purchased market data packages.</li>
            <li><strong>Chargebacks:</strong> Users who initiate a chargeback or payment dispute are not eligible for refunds and may have their account suspended.</li>
          </ul>

          <h2>Account Suspension & Termination</h2>
          <p>
            If your account is suspended or terminated due to violations of our Terms of Use or Acceptable Use Policy, 
            no refund will be issued. Your subscription features and data remain accessible during any content-publishing ban, 
            but VizionX is not obligated to provide refunds for enforcement actions.
          </p>

          <h2>Beta Period</h2>
          <p>
            During the Beta period, no payments are collected and therefore no refunds apply. 
            When VizionX transitions to paid plans, users will be notified in advance and given the opportunity 
            to select a plan or discontinue use.
          </p>

          <h2>Contact</h2>
          <p>
            For refund requests or billing inquiries, contact us at{' '}
            <a href="mailto:billing@vizionx.pro" className="text-cyan-400 hover:underline">billing@vizionx.pro</a>.
          </p>

          <div className="border-t border-white/10 pt-8 mt-12">
            <p className="text-xs text-white/30 text-center">© {new Date().getFullYear()} VizionX. All rights reserved. | www.vizionx.pro</p>
          </div>
        </div>
      </div>
    </div>
  );
}
