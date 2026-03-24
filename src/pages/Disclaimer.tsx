import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import InlineContactForm from '@/components/InlineContactForm';

export default function Disclaimer() {
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
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Disclaimer</h1>
        <p className="text-sm text-white/30 mb-10">Last updated: March 24, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 leading-relaxed [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-12 [&_h2]:mb-4 [&_strong]:text-white/90">

          <h2>No Investment Advice</h2>
          <p>
            Trading financial instruments — including cryptocurrencies, forex, equities, commodities, and leveraged products — 
            carries a significant degree of risk. You may sustain losses exceeding your initial deposit. 
            Any opinions, analyses, charts, alerts, messages, research, prices, or other information available on VizionX 
            (<a href="https://www.vizionx.pro" className="text-cyan-400 hover:underline">www.vizionx.pro</a>) 
            are provided strictly as <strong>general market information for educational and informational purposes only</strong> 
            and do not constitute investment advice, financial guidance, or a recommendation to buy, sell, or hold any financial instrument.
          </p>
          <p>
            VizionX should not be relied upon as a substitute for thorough, independent research and professional financial consultation 
            before making any trading or investment decisions. All opinions, market data, recommendations, and other content displayed on VizionX 
            are subject to change at any time without prior notice.
          </p>
          <p>
            <strong>VizionX will not accept liability for any loss or damage</strong>, including without limitation any loss of profit, 
            which may arise directly or indirectly from the use of or reliance on any information provided through the platform.
          </p>

          <h2>Risk of Trading</h2>
          <p>
            We do not endorse or recommend the use of technical analysis, charting tools, or any specific methodology 
            as the sole basis for trading decisions. Hasty or impulsive trading decisions should be avoided. 
            You should always consult with a qualified financial advisor and fully understand the risks involved before engaging in trading activities.
          </p>
          <p className="text-xs text-white/50 border border-white/10 rounded-lg p-4 bg-white/[0.02] uppercase tracking-wide">
            <strong className="text-white/70">PAST PERFORMANCE IS NOT NECESSARILY INDICATIVE OF FUTURE RESULTS.</strong> Historical data, 
            backtesting results, and simulated performance shown on VizionX do not guarantee future returns. 
            Market conditions change, and strategies that performed well in the past may not produce similar results in the future.
          </p>

          <h2>No Guarantee of Accuracy</h2>
          <p>
            While VizionX strives to provide accurate and timely market data, we make no representations or warranties regarding 
            the accuracy, completeness, reliability, or timeliness of any data, charts, indicators, or other content displayed on the platform. 
            Market data is sourced from third-party exchanges and data providers and may be subject to delays, interruptions, or errors. 
            VizionX shall not be held responsible for any discrepancies between data displayed on our platform and data available directly from exchanges.
          </p>

          <h2>Third-Party Data Providers</h2>
          <p>
            Market data and indices displayed on VizionX may include intellectual property of third-party providers, exchanges, 
            and index operators. Such third parties have not been involved in the creation, development, or operation of VizionX. 
            The VizionX platform is neither sponsored, promoted, distributed, nor supported by any third-party data provider or exchange.
          </p>
          <p>
            Third-party data providers, exchanges, and their licensors, research partners, or data suppliers:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li>Make no warranty of any kind regarding accuracy, adequacy, correctness, completeness, timeliness, or fitness for any purpose</li>
            <li>Exclude any liability whatsoever (whether in negligence or otherwise) for errors, omissions, or interruptions in data</li>
            <li>Bear no responsibility for any trading decisions made based on their data as displayed on VizionX</li>
          </ul>

          <h2>Beta Product Disclaimer</h2>
          <p>
            VizionX is currently in <strong>Beta</strong>. As such, the platform may contain bugs, experience downtime for maintenance 
            and updates, and undergo significant changes without prior notice. Users acknowledge and accept that using a Beta product 
            involves inherent risks, including but not limited to data loss, feature instability, and service interruptions. 
            VizionX makes no guarantees regarding uptime, data preservation, or feature availability during the Beta period.
          </p>

          <h2>User-Generated Content</h2>
          <p>
            Analyses, ideas, scripts, indicators, and other content published by VizionX users represent the personal opinions 
            of their respective authors. VizionX does not review, verify, endorse, or guarantee the accuracy of user-generated content. 
            Reliance on user-generated content is entirely at your own risk.
          </p>

          <h2>Regulatory Notice</h2>
          <p>
            VizionX is not a registered broker-dealer, investment advisor, or financial institution. 
            We do not hold or manage client funds, execute trades on behalf of users, or provide personalized financial advice. 
            The availability of VizionX services does not constitute an offer or solicitation in any jurisdiction where such 
            services would be unlawful. Users are solely responsible for ensuring compliance with the laws and regulations 
            applicable in their jurisdiction.
          </p>

          <h2>Limitation of Liability</h2>
          <p className="uppercase text-xs text-white/50 leading-relaxed">
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, VIZIONX, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, 
            AND AGENTS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES 
            — INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES — RESULTING FROM 
            (A) YOUR ACCESS TO OR USE OF (OR INABILITY TO USE) THE PLATFORM; (B) ANY CONDUCT OR CONTENT OF THIRD PARTIES 
            ON THE PLATFORM; (C) ANY DATA OR CONTENT OBTAINED FROM THE PLATFORM; OR (D) UNAUTHORIZED ACCESS, USE, OR 
            ALTERATION OF YOUR DATA OR TRANSMISSIONS, WHETHER BASED ON WARRANTY, CONTRACT, TORT, OR ANY OTHER LEGAL THEORY, 
            AND WHETHER OR NOT VIZIONX HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>

          <h2>Contact</h2>
          <p>
            If you have questions about this disclaimer, please contact us at{' '}
            <a href="mailto:legal@vizionx.pro" className="text-cyan-400 hover:underline">legal@vizionx.pro</a>.
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
