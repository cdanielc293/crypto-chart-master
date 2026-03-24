import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import InlineContactForm from '@/components/InlineContactForm';

export default function Terms() {
  const navigate = useNavigate();
  const lastUpdated = 'March 24, 2026';

  return (
    <div className="min-h-screen bg-[#050508] text-white/80">
      {/* Header */}
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
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Terms of Use, Policies & Disclaimers</h1>
        <p className="text-sm text-white/30 mb-10">Last updated: {lastUpdated}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 leading-relaxed [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-white/90 [&_h3]:text-lg [&_h3]:font-semibold [&_strong]:text-white/90">

          <p>
            By accessing or using the VizionX platform located at{' '}
            <a href="https://www.vizionx.pro" className="text-cyan-400 hover:underline">www.vizionx.pro</a>{' '}
            (including all associated services, tools, and features), you acknowledge and agree to be bound by these Terms of Use. 
            If you do not agree with any part of these terms, you must discontinue use of VizionX immediately. 
            VizionX is owned and operated by VizionX ("we," "us," or "our").
          </p>

          <p className="text-xs text-white/40 border border-white/10 rounded-lg p-4 bg-white/[0.02]">
            <strong className="text-white/60">IMPORTANT NOTICE:</strong> These Terms contain provisions that limit our liability and govern dispute resolution. 
            By using VizionX, you agree to resolve disputes through binding arbitration on an individual basis, 
            waiving any right to participate in class-action lawsuits or class-wide arbitration, unless you opt out within 30 days of account creation as described in Section 25.
          </p>

          <h2>1. Modifications to These Terms</h2>
          <p>
            We reserve the right to revise, amend, or update these Terms at any time and at our sole discretion. 
            Continued use of VizionX following any changes constitutes your acceptance of the revised Terms. 
            The most current version of these Terms will always be accessible on this page. 
            We encourage you to review these Terms periodically.
          </p>

          <h2>2. Changes to the Platform</h2>
          <p>
            VizionX may introduce, modify, suspend, or discontinue any feature, service, or functionality at any time without prior notice. 
            We do not guarantee backward compatibility of our services, APIs, or any integrated tools in the event of such changes.
          </p>

          <h2>3. Intellectual Property & Usage Rights</h2>
          <p>
            All content, data, graphics, software, trademarks, and other materials available through VizionX — including but not limited to charting tools, 
            indicators, analysis features, and market data displays — are the exclusive property of VizionX, its affiliates, or its data providers, 
            and are protected by applicable intellectual property laws worldwide.
          </p>
          <p>
            The content and market data presented on VizionX, including charts, alerts, notifications, and any derived information, 
            are licensed exclusively for <strong>display-only, personal, or internal business use</strong>. The following uses are strictly prohibited:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li>Automated trading, algorithmic order generation, or systematic execution based on VizionX data</li>
            <li>Price referencing, order verification, or smart order routing</li>
            <li>Integration into risk management systems or operational control programs</li>
            <li>Any machine-driven process that does not involve direct human-readable display</li>
            <li>Creating derivative products, services, or tools based on VizionX content</li>
            <li>Redistribution, sublicensing, selling, or transferring any VizionX data for compensation</li>
          </ul>
          <p>
            These restrictions apply equally to direct users and any third-party entities that create products or services 
            interacting with VizionX data. VizionX reserves the right to conduct investigations, pursue legal remedies, 
            and terminate accounts found in violation.
          </p>

          <h2>4. Attribution Requirements</h2>
          <p>
            VizionX grants users permission to use snapshots and screenshots of VizionX charts in publications, articles, 
            educational content, video broadcasts, and social media, provided that clear and visible attribution to VizionX is maintained at all times. 
            Attribution must include a reference such as: <em>"Charts by VizionX"</em> or <em>"Analysis powered by VizionX."</em>
          </p>
          <p>
            Use of VizionX materials without proper attribution, or removal/modification of attribution from embedded tools and widgets, 
            may result in account suspension and legal action.
          </p>

          <h2>5. External Links & Third-Party Content</h2>
          <p>
            VizionX may contain links to third-party websites, services, or advertisers. 
            These links are provided for convenience only and do not imply endorsement. 
            VizionX assumes no responsibility for the content, accuracy, or practices of external sites. 
            Any transactions or interactions with third-party advertisers or services are solely between you and the respective party. 
            Unauthorized solicitation on VizionX is strictly prohibited and may result in immediate account termination.
          </p>

          <h2>6. Disclaimer of Warranties</h2>
          <p className="uppercase text-xs text-white/50 leading-relaxed">
            THE VIZIONX PLATFORM, INCLUDING ALL SERVICES, CONTENT, DATA, AND MATERIALS, IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. 
            VIZIONX MAKES NO WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO WARRANTIES OF 
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, RELIABILITY, OR NON-INFRINGEMENT. VIZIONX DOES NOT GUARANTEE 
            THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM HARMFUL COMPONENTS. YOUR USE OF THE PLATFORM 
            IS ENTIRELY AT YOUR OWN RISK. ANY DATA OR MATERIAL OBTAINED THROUGH VIZIONX IS ACCESSED AT YOUR OWN DISCRETION, AND YOU 
            BEAR SOLE RESPONSIBILITY FOR ANY RESULTING DAMAGE OR LOSS.
          </p>
          <p>
            Market data displayed on VizionX is sourced from third-party providers and exchanges believed to be reliable. 
            However, due to the inherent possibility of technical and human error, the accuracy, completeness, and timeliness 
            of such data cannot be guaranteed. Third-party scripts, indicators, and community-contributed content are used at your sole risk.
          </p>

          <h2>7. Investment & Trading Disclaimer</h2>
          <p>
            <strong>VizionX does not provide financial, investment, or trading advice.</strong> All decisions to buy, sell, hold, or trade 
            securities, cryptocurrencies, commodities, or any other financial instruments involve substantial risk and should be made 
            only after consulting with a qualified financial professional. Day trading and leveraged trading carry particularly high risks 
            and may result in losses exceeding your initial investment. Under no circumstances shall VizionX be liable for any losses 
            incurred as a result of trading or investment decisions made based on information obtained through our platform.
          </p>

          <h2>8. Hypothetical Performance Disclaimer</h2>
          <p>
            Hypothetical or simulated performance results presented on VizionX have inherent limitations. 
            They are typically prepared with the benefit of hindsight, do not involve actual financial risk, 
            and cannot fully account for the impact of real market conditions. No representation is made that any account 
            will achieve results similar to those shown. Actual trading results may differ materially from hypothetical projections.
          </p>

          <h2>9. User Accounts & Registration</h2>
          <p>
            Certain features of VizionX require account registration. By creating an account, you represent that:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li>You are of legal age to form a binding contract in your jurisdiction</li>
            <li>All registration information you provide is truthful, accurate, and current</li>
            <li>You will maintain the accuracy of your account information</li>
            <li>You possess all necessary intellectual property rights to any content you submit</li>
          </ul>
          <p>
            VizionX reserves the right to suspend or terminate accounts that contain inaccurate information 
            or violate these Terms, without prior notice.
          </p>

          <h2>10. Account Security</h2>
          <p>
            You are solely responsible for maintaining the confidentiality of your account credentials and for all activities 
            conducted under your account. You agree to immediately notify VizionX of any unauthorized access or security breach. 
            VizionX shall not be liable for any loss or damage resulting from your failure to safeguard your account credentials.
          </p>

          <h2>11. Beta Program</h2>
          <p>
            VizionX is currently in <strong>Beta</strong>. During this period, all features — including premium-tier functionality — 
            are provided free of charge. Beta users acknowledge that:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li>The platform may contain bugs, errors, or incomplete features</li>
            <li>Service interruptions may occur for updates and maintenance</li>
            <li>Features and pricing may change when VizionX exits Beta</li>
            <li>Data stored during Beta may not be preserved in all cases</li>
          </ul>
          <p>
            Upon exiting Beta, subscription plans and pricing as described on our Pricing page will take effect. 
            Users will be notified in advance of any transition to paid services.
          </p>

          <h2>12. Subscription & Payment Terms</h2>
          <p>
            When paid subscriptions become available, by subscribing to any VizionX plan, you authorize recurring charges 
            according to the selected billing cycle (monthly or annual). Subscriptions renew automatically unless cancelled 
            prior to the renewal date. You are solely responsible for managing your subscription through your account Settings page. 
            Email requests alone do not constitute valid cancellation.
          </p>
          <p>
            Refund eligibility, cancellation policies, and plan-specific terms will be clearly communicated at the time of purchase.
          </p>

          <h2>13. User-Generated Content & Feedback</h2>
          <p>
            By submitting any content, ideas, suggestions, or feedback to VizionX, you grant us a worldwide, irrevocable, 
            perpetual, royalty-free license to use, modify, display, and distribute such content. You acknowledge that: 
            (a) submissions do not contain confidential information; (b) VizionX has no obligation of confidentiality regarding submissions; 
            (c) VizionX may already have similar concepts under development; and (d) you are not entitled to compensation for submissions.
          </p>

          <h2>14. Community Guidelines</h2>
          <p>
            By using VizionX, you agree to conduct yourself respectfully and in accordance with our community standards. 
            Violations may result in content removal, account warnings, or permanent suspension. 
            Paid subscriptions do not exempt users from community enforcement actions.
          </p>

          <h2>15. Scripts & Custom Indicators</h2>
          <p>
            You retain ownership of scripts and custom indicators you create on VizionX, provided you hold all necessary intellectual property rights. 
            By publishing a script, you grant VizionX a license to display and make it available according to the publishing settings you select. 
            VizionX is not responsible for any use or misuse of published scripts by other users. 
            Scripts published without an explicit license are governed by the Mozilla Public License 2.0.
          </p>

          <h2>16. No Professional Recommendation</h2>
          <p>
            All content published on VizionX — including user analyses, ideas, and community discussions — represents the personal opinions 
            of their respective authors. VizionX does not endorse, verify, or guarantee the accuracy of user-generated content. 
            Such content does not constitute financial advice, recommendations, or solicitations of any kind.
          </p>

          <h2>17. VizionX Referral Program</h2>
          <p>
            VizionX account holders may participate in our referral program. Referees must be new users who create accounts 
            through a valid referral link. Referrers agree not to use spam, bulk messaging, automated systems, 
            or misleading claims to generate referrals. Referral rewards are non-transferable, have no cash value, 
            and expire 24 months after issuance. VizionX reserves the right to modify or terminate the referral program 
            at any time and to revoke rewards in cases of suspected fraud or abuse.
          </p>

          <h2>18. Third-Party Software & Integrations</h2>
          <p>
            VizionX may incorporate third-party software components, libraries, and services. 
            Such components are provided under their respective licenses and terms. 
            VizionX disclaims all warranties regarding third-party software. 
            Your use of third-party integrations is governed by the applicable third-party terms, not these Terms.
          </p>

          <h2>19. Communications</h2>
          <p>
            By creating an account, you consent to receive service-related communications, announcements, 
            and promotional materials from VizionX via email. You may unsubscribe from marketing communications at any time 
            using the link provided in each email.
          </p>

          <h2>20. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless VizionX, its affiliates, officers, directors, employees, 
            agents, and partners from any claims, demands, losses, liabilities, and expenses (including legal fees) 
            arising from your use of VizionX, your content, your violation of these Terms, or your infringement of any third-party rights. 
            This obligation survives termination of your account.
          </p>

          <h2>21. Account Termination</h2>
          <p>
            You may delete your account at any time through your Settings page. Upon deletion, personal data associated with your account 
            will be removed, except for data that has been integrated into our systems or is required for legitimate business purposes. 
            Published contributions may remain on the platform at our discretion to maintain the integrity of communal knowledge.
          </p>
          <p>
            VizionX may terminate, suspend, or restrict your access at any time without prior notice for reasons including, but not limited to: 
            Terms violations, fraudulent activity, security concerns, legal requests, extended inactivity, or service discontinuation.
          </p>

          <h2>22. Limitation of Liability</h2>
          <p className="uppercase text-xs text-white/50 leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, VIZIONX AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND PARTNERS SHALL NOT 
            BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES ARISING FROM: YOUR USE OR 
            INABILITY TO USE THE PLATFORM; SERVICE MODIFICATIONS OR INTERRUPTIONS; UNAUTHORIZED ACCESS TO YOUR DATA; USER-GENERATED 
            CONTENT; THIRD-PARTY CONDUCT ON THE PLATFORM; OR ANY OTHER MATTER RELATING TO VIZIONX SERVICES — EVEN IF ADVISED OF THE 
            POSSIBILITY OF SUCH DAMAGES.
          </p>

          <h2>23. Data Sources & Market Data</h2>
          <p>
            VizionX aggregates market data from multiple cryptocurrency exchanges and data providers. 
            While we strive to provide accurate and timely information, we cannot guarantee the completeness 
            or precision of data from third-party sources. Displayed prices may include derived or blended data 
            and should not be used as the sole basis for financial decisions. Raw exchange data is processed 
            through our proprietary systems and may not exactly match figures on source exchanges.
          </p>

          <h2>24. Governing Law</h2>
          <p>
            These Terms and your use of VizionX are governed by the laws of the State of New York, United States, 
            without regard to its conflict of law provisions. If you reside in a member state of the European Economic Area (EEA) 
            or in any jurisdiction where this arbitration agreement is prohibited by local law, the arbitration provisions below 
            do not apply to you, and disputes will be governed by the applicable local law and resolved in the courts of your country of residence. 
            The application of the United Nations Convention on Contracts for the International Sale of Goods (CISG) is expressly excluded.
          </p>

          <h2>25. Arbitration Agreement</h2>

          <h3>25.1 Applicability</h3>
          <p>
            Subject to the terms of this Arbitration Agreement, you and VizionX agree that any disagreement, controversy, or claim 
            arising out of or relating to your access to or use of VizionX at{' '}
            <a href="https://www.vizionx.pro" className="text-cyan-400 hover:underline">www.vizionx.pro</a>, 
            any communications you receive, and/or these Terms of Use (each, a "Dispute") will be resolved by binding arbitration 
            rather than in court, except that: (1) you and VizionX may assert claims in small claims court if such claims qualify 
            and remain in small claims court; and (2) you or VizionX may seek equitable relief in court for infringement or misuse 
            of intellectual property rights (including trademarks, trade secrets, copyrights, and patents). 
            "Dispute" also includes disputes arising from facts occurring before or after these Terms, 
            as well as claims that may arise after termination of these Terms.
          </p>

          <h3>25.2 Waiver of Jury Trial</h3>
          <p className="uppercase text-xs text-white/50 leading-relaxed">
            YOU AND VIZIONX HEREBY WAIVE ANY CONSTITUTIONAL AND STATUTORY RIGHTS TO SUE IN COURT AND HAVE A TRIAL 
            BEFORE A JUDGE OR JURY. YOU AND VIZIONX ELECT THAT ALL DISPUTES SHALL BE RESOLVED BY ARBITRATION UNDER 
            THIS AGREEMENT, EXCEPT AS SPECIFIED IN SECTION 25.1 ABOVE. THERE IS NO JUDGE OR JURY IN ARBITRATION, 
            AND COURT REVIEW OF AN ARBITRATION AWARD IS SUBJECT TO VERY LIMITED REVIEW.
          </p>

          <h3>25.3 Waiver of Class and Collective Relief</h3>
          <p className="uppercase text-xs text-white/50 leading-relaxed">
            EACH PARTY MAY BRING CLAIMS AGAINST THE OTHER ONLY ON AN INDIVIDUAL BASIS AND NOT ON A CLASS, REPRESENTATIVE, 
            OR COLLECTIVE BASIS. THE PARTIES HEREBY WAIVE ALL RIGHTS TO HAVE ANY DISPUTE BROUGHT, HEARD, ADMINISTERED, 
            RESOLVED, OR ARBITRATED ON A CLASS, COLLECTIVE, OR REPRESENTATIVE BASIS. ONLY INDIVIDUAL RELIEF IS AVAILABLE. 
            THE ARBITRATOR MAY AWARD DECLARATORY OR INJUNCTIVE RELIEF ONLY IN FAVOR OF THE INDIVIDUAL PARTY SEEKING RELIEF 
            AND ONLY TO THE EXTENT NECESSARY TO PROVIDE RELIEF WARRANTED BY THAT PARTY'S INDIVIDUAL CLAIM.
          </p>
          <p>
            If a final, non-appealable decision determines that the limitations of this subsection are invalid or unenforceable 
            as to a particular claim or request for relief (such as public injunctive relief), that particular claim shall be 
            severed from arbitration and may be litigated in state or federal courts located in New York. 
            All other Disputes shall remain subject to arbitration. This subsection does not prevent either party 
            from participating in a class-wide or mass settlement of claims.
          </p>

          <h3>25.4 Arbitration Rules & Forum</h3>
          <p>
            These Terms evidence a transaction involving interstate commerce, and the Federal Arbitration Act (9 U.S.C. § 1 et seq.) 
            governs the interpretation and enforcement of this Arbitration Agreement. Arbitration will be administered by a nationally 
            recognized arbitration organization in accordance with its then-current rules and procedures, as modified by this Agreement. 
            A party initiating arbitration must provide a written Demand including: (1) name, contact information, and account details; 
            (2) a statement of claims and factual bases; (3) a description of the remedy sought with a good-faith calculation of the amount 
            in controversy in U.S. Dollars; and (4) certification that the requesting party will pay applicable filing fees.
          </p>
          <p>
            Demands should be submitted through the contact form at the bottom of this page.
            Unless otherwise agreed, arbitration will be conducted in the county of your residence.
            The arbitration shall be conducted in English by a single arbitrator who is either a retired judge or licensed attorney.
          </p>

          <h3>25.5 Authority of the Arbitrator</h3>
          <p>
            The arbitrator shall have exclusive authority to resolve any Dispute, including the interpretation, enforceability, 
            revocability, scope, or validity of this Arbitration Agreement, except that disputes regarding Section 25.3 
            (Waiver of Class and Collective Relief) shall be decided by a court of competent jurisdiction. 
            The arbitrator may grant dispositive motions and shall issue a written award with findings and conclusions. 
            The arbitrator's award is final and binding, and judgment may be entered in any court having jurisdiction.
          </p>

          <h3>25.6 Batch Arbitration</h3>
          <p>
            If 25 or more individual Demands of a substantially similar nature are filed against VizionX by or with the assistance 
            of the same law firm or organization within a 90-day period, the arbitration administrator shall: (1) group Demands 
            into batches of up to 100; (2) appoint one arbitrator per batch; and (3) resolve each batch on a consolidated basis 
            with a single set of fees, one procedural calendar, one hearing (if any), and one final award determining individual relief 
            for each claimant. Batches shall be administered concurrently where possible. This provision does not authorize class, 
            collective, or representative arbitration except as expressly stated herein.
          </p>

          <h3>25.7 30-Day Opt-Out Right</h3>
          <p>
            You may opt out of this Arbitration Agreement by sending written notice through the contact form below
            within 30 days of first becoming subject to it. Your notice must include your name, address,
            the email address associated with your VizionX account, and a clear statement that you wish to opt out.
            Opt-out notices must be sent individually — notices from third parties purporting to act on your behalf are ineffective.
            Opting out does not affect any other part of these Terms or any prior arbitration agreements you did not timely opt out of.
          </p>

          <h3>25.8 Severability of Arbitration Provisions</h3>
          <p>
            If any part of this Arbitration Agreement (other than Section 25.6) is found invalid or unenforceable, 
            the remainder shall continue in full force. If Section 25.6 is found invalid or unenforceable, 
            the entire Arbitration Agreement shall be void, and all Disputes will be heard in state or federal courts 
            located in New York. All Disputes must be initiated within the applicable statute of limitations.
          </p>

          <h3>25.9 Modifications to Arbitration Agreement</h3>
          <p>
            VizionX may modify this Arbitration Agreement in the future. Changes will be posted at{' '}
            <a href="https://www.vizionx.pro/terms" className="text-cyan-400 hover:underline">www.vizionx.pro/terms</a>. 
            Your continued use of VizionX after changes are posted constitutes acceptance. 
            If you previously agreed to an arbitration agreement and did not validly opt out, 
            modifications do not provide a new opt-out opportunity for prior agreements.
          </p>

          <h3>25.10 Governing Courts</h3>
          <p>
            To the extent a Dispute is not covered by this Arbitration Agreement, it shall proceed before state or federal courts 
            located in New York, except for small claims court actions which may be brought in the county of your residence. 
            If you reside in the EEA, disputes will be resolved in the courts of your country of residence, 
            and you may invoke the mandatory consumer protection laws of your jurisdiction.
          </p>

          <h2>26. Severability</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated 
            to the minimum extent necessary, and the remaining provisions shall continue in full force and effect.
          </p>

          <h2>27. Entire Agreement</h2>
          <p>
            These Terms, together with our Privacy Policy and any other policies referenced herein, constitute the entire agreement 
            between you and VizionX regarding your use of the platform and supersede all prior agreements and understandings.
          </p>

          <h2>28. Contact</h2>
          <p>
            For questions about these Terms, please contact us at{' '}
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
