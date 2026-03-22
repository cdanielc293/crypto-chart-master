import { useNavigate } from 'react-router-dom';
import heroBg from '@/assets/hero-bg.jpg';
import vizionLogo from '@/assets/vizion-logo.png';
import { ChevronDown, BarChart3, Search, Zap, Shield, Globe, TrendingUp } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050508] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-[#050508]/60 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <img src={vizionLogo} alt="Vizion" className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            VIZION
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <span className="hover:text-white transition-colors cursor-pointer">Tools</span>
          <span className="hover:text-white transition-colors cursor-pointer">Insights</span>
          <span className="hover:text-white transition-colors cursor-pointer">Markets</span>
          <span className="hover:text-white transition-colors cursor-pointer">Analytics</span>
          <span className="hover:text-white transition-colors cursor-pointer">More</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/chart')}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400 transition-all shadow-lg shadow-cyan-500/20"
          >
            Get started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt=""
            className="w-full h-full object-cover"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#050508]/40 via-transparent to-[#050508]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050508]/60 via-transparent to-[#050508]/60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto mt-[-4vh]">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-6">
            <span className="block">Master Markets.</span>
            <span className="block bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent">
              Uncover Value.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            The definitive data platform for serious investors. Insight, not noise.
          </p>

          <button
            onClick={() => navigate('/chart')}
            className="group relative px-8 py-3.5 text-base font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400 transition-all shadow-2xl shadow-cyan-500/25 hover:shadow-cyan-400/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            Get started for free
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity -z-10" />
          </button>

          <p className="mt-4 text-sm text-white/30">
            $0 forever, no credit card needed
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/30" />
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold tracking-widest text-cyan-400/80 uppercase mb-4">
              Why Vizion
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Everything you need.
              <br />
              <span className="text-white/40">Nothing you don't.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: 'Advanced Charting',
                desc: 'Professional-grade charts with 100+ indicators, drawing tools, and multi-timeframe analysis.',
              },
              {
                icon: Zap,
                title: 'Real-Time Data',
                desc: 'Lightning-fast market data streaming. Every tick, every move, zero lag.',
              },
              {
                icon: Search,
                title: 'Deep Research',
                desc: 'Fundamental analysis, on-chain metrics, and institutional-grade data at your fingertips.',
              },
              {
                icon: TrendingUp,
                title: 'Strategy Replay',
                desc: 'Travel back in time. Replay any market moment across all timeframes simultaneously.',
              },
              {
                icon: Shield,
                title: 'Secure & Private',
                desc: 'Your strategies stay yours. End-to-end encryption, zero data selling.',
              },
              {
                icon: Globe,
                title: 'Global Markets',
                desc: 'Crypto, forex, equities, commodities — all unified in one powerful platform.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300"
              >
                <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/10 mb-4">
                  <feature.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Ready to see clearly?
          </h2>
          <p className="text-lg text-white/40 mb-10 max-w-xl mx-auto">
            Join thousands of traders who chose signal over noise.
          </p>
          <button
            onClick={() => navigate('/chart')}
            className="px-10 py-4 text-base font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400 transition-all shadow-2xl shadow-cyan-500/25 hover:shadow-cyan-400/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            Launch Vizion — It's Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-white/25">
          <div className="flex items-center gap-2">
            <img src={vizionLogo} alt="" className="h-5 w-5 opacity-50" />
            <span>© 2026 Vizion. All rights reserved.</span>
          </div>
          <div className="hidden md:flex gap-6">
            <span className="hover:text-white/50 transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-white/50 transition-colors cursor-pointer">Terms</span>
            <span className="hover:text-white/50 transition-colors cursor-pointer">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
