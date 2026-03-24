import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Star, Gem, ChevronDown } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import PolicyFooter from '@/components/PolicyFooter';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const tiers = [
  {
    name: 'VizionX Start',
    price: '$0',
    originalPrice: null,
    period: '/mo',
    billing: 'Free Forever',
    desc: 'The perfect entry into professional analysis.',
    icon: Star,
    free: true,
    features: [
      '1 chart per tab',
      '4 indicators per chart',
      '6K historical bars',
      '5 price & technical alerts',
      'Bar Replay (Daily)',
      'Web, Desktop, and Mobile sync',
    ],
  },
  {
    name: 'VizionX Core',
    price: '$6.50',
    originalPrice: '$12.95',
    period: '/mo',
    billing: 'Billed Annually',
    desc: 'The essential toolkit for every trader.',
    icon: Star,
    features: [
      '2 charts per tab',
      '5 indicators per chart',
      '10K historical bars',
      '20 price & technical alerts',
      'Bar Replay (Daily & Higher)',
      'Ad-Free Experience',
      'Web, Desktop, and Mobile sync',
    ],
  },
  {
    name: 'VizionX Prime',
    price: '$14.15',
    originalPrice: '$28.30',
    period: '/mo',
    billing: 'Billed Annually',
    desc: 'Advanced tools for serious market analysis.',
    icon: Zap,
    popular: true,
    features: [
      '4 charts per tab',
      '10 indicators per chart',
      '10K historical bars',
      '100 price & technical alerts',
      'Intraday Bar Replay',
      'Volume Profile & Footprint',
      'Custom Timeframes & Range Bars',
      'Multi-condition alerts',
    ],
  },
  {
    name: 'VizionX Elite',
    price: '$28.25',
    originalPrice: '$56.50',
    period: '/mo',
    billing: 'Billed Annually',
    desc: 'Professional grade for the high-volume analyst.',
    icon: Crown,
    features: [
      '8 charts per tab',
      '25 indicators per chart',
      '20K historical bars',
      '400 price & technical alerts',
      'Intraday Renko, Kagi, & Point & Figure',
      'Deep Backtesting Engine',
      'Auto Chart Pattern Recognition',
      'Second-based intervals',
    ],
  },
  {
    name: 'VizionX Zenith',
    price: '$99.95',
    originalPrice: '$199.90',
    period: '/mo',
    billing: 'Billed Annually',
    desc: 'The ultimate power. No limits. No compromises.',
    icon: Gem,
    features: [
      '16 charts per tab',
      '50 indicators per chart',
      '40K historical bars',
      '1,000 price & technical alerts',
      'Tick-based intervals & alerts',
      'Buy Professional Market Data',
      'First Priority Support',
      'The only plan for institutional-grade users',
    ],
  },
];

const comparisonRows = [
  { feature: 'Price', vizionx: '50% Lower', competition: 'Industry Standard' },
  { feature: 'P&F Charts', vizionx: 'Included in Elite', competition: 'Locked in Premium' },
  { feature: 'Backtesting', vizionx: 'High-Performance Engine', competition: 'Standard Scripting' },
  { feature: 'UX/UI', vizionx: 'Modern & Ultra-Fast', competition: 'Heavy & Cluttered' },
];

const faqs = [
  {
    q: 'How long is the "Free Launch" period?',
    a: 'We are committed to building the best community. The Zenith access will remain free until we officially announce our transition to the discounted paid tiers. We will give all users a 30-day notice.',
  },
  {
    q: 'Do I need a credit card now?',
    a: 'No. Your VizionX starts with zero friction. Just sign up and start analyzing.',
  },
  {
    q: 'What happens to my charts after the launch?',
    a: 'Everything you build, draw, and save during the launch period is yours to keep. Your data is your property.',
  },
];

const cardAnim = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {/* Nav */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-[#050508]/60 border-b border-white/5"
      >
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
          <img src={vizionLogo} alt="VizionX" className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            VIZIONX
          </span>
          <span className="ml-2 px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase">Beta</span>
        </button>
        <button
          onClick={() => navigate('/signup?tier=zenith')}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400 transition-all shadow-lg shadow-cyan-500/20"
        >
          Get started
        </button>
      </motion.nav>

      {/* FREE LAUNCH BANNER */}
      <div className="pt-[72px]">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative overflow-hidden bg-gradient-to-r from-cyan-500/10 via-teal-500/10 to-cyan-500/10 border-b border-cyan-500/20"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] opacity-50" />
          <div className="relative flex items-center justify-center gap-3 py-3.5 px-6">
            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
            <p className="text-sm sm:text-base font-semibold">
              <span className="text-cyan-400">🚀 BETA LAUNCH:</span>{' '}
              <span className="text-white/70">All Zenith features unlocked —</span>{' '}
              <span className="text-cyan-300 font-bold">100% FREE</span>{' '}
              <span className="text-white/50">during Beta</span>
            </p>
            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
        </motion.div>
      </div>

      {/* Header */}
      <section className="pt-20 pb-8 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <p className="text-sm font-semibold tracking-widest text-cyan-400/80 uppercase mb-4">Pricing</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
            Clarity Without{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Compromise
            </span>
          </h1>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            Future-proof your trading. We've cut the industry standard prices by 50%.
          </p>
        </motion.div>
      </section>

      {/* Special Launch Offer */}
      <section className="px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-3xl mx-auto relative rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 via-transparent to-teal-500/5 p-8 sm:p-10 text-center overflow-hidden"
        >
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="relative">
           <p className="text-sm font-semibold tracking-widest text-cyan-400/80 uppercase mb-3">
              🚀 Beta Launch Offer
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">ALL FEATURES UNLOCKED</h2>
            <p className="text-white/50 max-w-lg mx-auto mb-4">
              We're in <span className="text-cyan-400 font-semibold">Beta</span> — and during this period, every user gets full{' '}
              <span className="text-cyan-400 font-semibold">Zenith-level access</span> completely free.
              We're working hard to deliver the best experience possible.
            </p>
            <p className="text-xs text-white/30 mb-6 max-w-md mx-auto">
              As a Beta product, you may experience occasional downtime for updates and improvements. We appreciate your patience!
            </p>
            <motion.button
              onClick={() => navigate('/signup?tier=zenith')}
              className="px-8 py-3.5 text-base font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400 transition-all shadow-2xl shadow-cyan-500/25"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Join the Beta — It's Free
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Pricing Tiers */}
      <section className="px-6 pb-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              custom={i}
              variants={cardAnim}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`relative group rounded-2xl border p-6 flex flex-col transition-colors duration-300 ${
                tier.popular
                  ? 'border-cyan-500/30 bg-cyan-500/[0.03]'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-black uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/10 mb-4 self-start">
                <tier.icon className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
              <p className="text-sm text-white/40 mb-4">{tier.desc}</p>

              <div className="mb-1">
                <span className="text-3xl font-extrabold">{tier.price}</span>
                <span className="text-white/40 text-sm">{tier.period}</span>
              </div>
              <p className="text-xs text-white/30 mb-1">{tier.billing}</p>
              {tier.originalPrice && <p className="text-xs text-white/20 line-through mb-5">Was {tier.originalPrice}/mo</p>}
              {(tier as any).free && <p className="text-xs text-cyan-400/60 font-medium mb-5">No credit card needed</p>}

              <div className="flex-1 space-y-3 mb-6">
                {tier.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-white/60">{f}</span>
                  </div>
                ))}
              </div>

              <motion.button
                onClick={() => navigate(`/signup?tier=${tier.name.split(' ')[1].toLowerCase()}`)}
                className={`w-full py-3 text-sm font-semibold rounded-xl transition-all ${
                  tier.popular
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400 shadow-lg shadow-cyan-500/20'
                    : 'border border-white/10 text-white hover:bg-white/5'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started Free
              </motion.button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm font-semibold tracking-widest text-cyan-400/80 uppercase mb-4">
              The VizionX Advantage
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Why traders <span className="text-white/40">switch to us</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-white/5 overflow-hidden"
          >
            <div className="grid grid-cols-3 bg-white/[0.03] border-b border-white/5">
              <div className="p-4 text-sm font-semibold text-white/60">Feature</div>
              <div className="p-4 text-sm font-semibold text-cyan-400">VizionX (Any Tier)</div>
              <div className="p-4 text-sm font-semibold text-white/30">The Competition</div>
            </div>
            {comparisonRows.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 ${i < comparisonRows.length - 1 ? 'border-b border-white/5' : ''}`}
              >
                <div className="p-4 text-sm text-white/70">{row.feature}</div>
                <div className="p-4 text-sm text-cyan-300 font-medium">{row.vizionx}</div>
                <div className="p-4 text-sm text-white/25">{row.competition}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Details */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: 'Charting & Data',
              items: [
                'Simultaneous Connections: Up to 200 on Zenith.',
                'Historical Data: From 10K to 40K bars depending on your tier.',
                'Custom Formulas: Build spreads and custom intraday formulas effortlessly.',
                'Data Export: Full CSV/Excel export available on all paid tiers.',
              ],
            },
            {
              title: 'Alerts & Automation',
              items: [
                "Durations: VizionX alerts don't expire prematurely.",
                'Webhooks: Send alerts directly to your execution bots.',
                'Watchlist Alerts: Stay notified when your entire list hits a setup.',
              ],
            },
          ].map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-6"
            >
              <h3 className="text-lg font-bold mb-4">{section.title}</h3>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-white/50">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-5xl mx-auto mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center"
        >
          <h3 className="text-lg font-bold mb-2">Global Markets in Your Hand</h3>
          <p className="text-sm text-white/40 max-w-2xl mx-auto">
            We connect you to institutional-grade data partners, providing direct access to over{' '}
            <span className="text-cyan-400 font-semibold">3.5 Million instruments</span> worldwide. Crypto,
            Stocks, Forex, and Futures—all in one VizionX.
          </p>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm font-semibold tracking-widest text-cyan-400/80 uppercase mb-4">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Frequently Asked Questions</h2>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <AccordionItem
                  value={`faq-${i}`}
                  className="rounded-xl border border-white/5 bg-white/[0.02] px-5 data-[state=open]:border-white/10"
                >
                  <AccordionTrigger className="text-sm font-medium text-white/80 hover:no-underline hover:text-white">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-white/40">{faq.a}</AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 pb-32">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Ready to Master the Markets?
          </h2>
          <p className="text-lg text-white/40 mb-8">Join the elite. Start your VizionX today.</p>
          <motion.button
            onClick={() => navigate('/signup?tier=zenith')}
            className="px-10 py-4 text-base font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400 transition-all shadow-2xl shadow-cyan-500/25"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Get Started For Free
          </motion.button>
        </motion.div>
      </section>

      <PolicyFooter />
    </div>
  );
}
