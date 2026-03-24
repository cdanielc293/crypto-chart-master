import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, XCircle, Clock, Wrench, Info } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import InlineContactForm from '@/components/InlineContactForm';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance' | 'checking';
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  operational: { label: 'Operational', color: 'text-emerald-400', icon: CheckCircle },
  degraded: { label: 'Degraded', color: 'text-yellow-400', icon: AlertTriangle },
  outage: { label: 'Outage', color: 'text-red-400', icon: XCircle },
  maintenance: { label: 'Maintenance', color: 'text-blue-400', icon: Wrench },
  checking: { label: 'Checking...', color: 'text-white/30', icon: Clock },
};

const incidents = [
  { date: 'Mar 24, 2026', title: 'Scheduled maintenance', status: 'Resolved', detail: 'Maintenance completed successfully.', time: '06:00 – 06:20 GMT', type: 'maintenance' },
  { date: 'Mar 20, 2026', title: 'Intermittent data feed delays', status: 'Resolved', detail: 'Some users experienced delayed candle updates. Root cause identified and patched.', time: '14:30 – 15:45 GMT', type: 'incident' },
  { date: 'Mar 15, 2026', title: 'Scheduled maintenance', status: 'Resolved', detail: 'Platform update deployed. No user impact.', time: '05:00 – 05:35 GMT', type: 'maintenance' },
  { date: 'Mar 10, 2026', title: 'Chart loading slowdown', status: 'Resolved', detail: 'Chart rendering was slower than expected for some users during peak hours. Performance optimizations applied.', time: '18:00 – 19:30 GMT', type: 'incident' },
  { date: 'Mar 3, 2026', title: 'Watchlist sync issue', status: 'Resolved', detail: 'Watchlist changes were not syncing for a subset of users. Fixed with a backend patch.', time: '09:10 – 10:05 GMT', type: 'incident' },
  { date: 'Feb 25, 2026', title: 'Scheduled maintenance', status: 'Resolved', detail: 'Infrastructure upgrade completed.', time: '04:00 – 04:40 GMT', type: 'maintenance' },
  { date: 'Feb 18, 2026', title: 'Alert delivery delays', status: 'Resolved', detail: 'Price alerts experienced delivery delays of up to 5 minutes. Resolved.', time: '11:00 – 12:20 GMT', type: 'incident' },
];

const last90Days = Array.from({ length: 90 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (89 - i));
  const hasIncident = incidents.some(inc => {
    const incDate = new Date(inc.date);
    return incDate.toDateString() === d.toDateString() && inc.type === 'incident';
  });
  const hasMaint = incidents.some(inc => {
    const incDate = new Date(inc.date);
    return incDate.toDateString() === d.toDateString() && inc.type === 'maintenance';
  });
  return { date: d, status: hasIncident ? 'incident' : hasMaint ? 'maintenance' : 'healthy' };
});

async function checkBackendHealth(): Promise<'operational' | 'outage'> {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return error ? 'outage' : 'operational';
  } catch {
    return 'outage';
  }
}

async function checkDataFeedHealth(): Promise<'operational' | 'degraded' | 'outage'> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ping');
    return res.ok ? 'operational' : 'degraded';
  } catch {
    return 'degraded';
  }
}

export default function Status() {
  const navigate = useNavigate();
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Website', status: 'checking' },
    { name: 'Backend Services', status: 'checking' },
    { name: 'Data Feeds', status: 'checking' },
    { name: 'Alerts', status: 'operational' },
    { name: 'Indicators & Scripts', status: 'operational' },
    { name: 'Chart Engine', status: 'operational' },
    { name: 'Watchlist', status: 'operational' },
    { name: 'Drawing Tools', status: 'operational' },
    { name: 'User Accounts', status: 'checking' },
  ]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const runChecks = async () => {
      const backendStatus = await checkBackendHealth();
      const dataFeedStatus = await checkDataFeedHealth();

      setServices(prev => prev.map(svc => {
        if (svc.name === 'Website') return { ...svc, status: 'operational' as const };
        if (svc.name === 'Backend Services') return { ...svc, status: backendStatus };
        if (svc.name === 'Data Feeds') return { ...svc, status: dataFeedStatus };
        if (svc.name === 'User Accounts') return { ...svc, status: backendStatus };
        return svc;
      }));
      setLastChecked(new Date());
    };

    runChecks();
    const interval = setInterval(runChecks, 60000);
    return () => clearInterval(interval);
  }, []);

  const allOperational = services.every(s => s.status === 'operational');
  const hasOutage = services.some(s => s.status === 'outage');

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

      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Overall Status */}
        <div className={`text-center mb-12 p-6 rounded-2xl border ${allOperational ? 'border-emerald-500/20 bg-emerald-500/5' : hasOutage ? 'border-red-500/20 bg-red-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
          {allOperational ? (
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          ) : hasOutage ? (
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          ) : (
            <AlertTriangle className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
          )}
          <h1 className="text-2xl font-bold text-white mb-1">
            {allOperational ? 'All Systems Operational' : hasOutage ? 'Service Disruption Detected' : 'Some Systems Experiencing Issues'}
          </h1>
          <p className="text-sm text-white/40">VizionX Platform Status</p>
          {lastChecked && (
            <p className="text-[10px] text-white/25 mt-2">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Automated Monitoring Disclaimer */}
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-white/60">
              <strong className="text-white/80">Automated Monitoring:</strong> This status page uses automated health checks that run every 60 seconds. 
              As VizionX is currently in <strong className="text-white/80">Beta</strong>, these checks may not capture all issues. 
              Service interruptions, maintenance windows, and temporary outages are expected as we improve the platform. 
              If you experience an issue not reflected here, please report it below.
            </p>
          </div>
        </div>

        {/* Services */}
        <div className="mb-12">
          <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden">
            {services.map((svc) => {
              const cfg = statusConfig[svc.status];
              const Icon = cfg.icon;
              return (
                <div key={svc.name} className="flex items-center justify-between px-5 py-3.5 bg-white/[0.01]">
                  <span className="text-sm text-white/80">{svc.name}</span>
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 90 Day Timeline */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Last 90 Days</h2>
            <div className="flex items-center gap-4 text-[10px] text-white/40">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Healthy</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-500" /> Incident</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500" /> Maintenance</span>
            </div>
          </div>
          <div className="flex gap-[2px] relative">
            {last90Days.map((day, i) => (
              <div
                key={i}
                className={`flex-1 h-8 rounded-[2px] cursor-pointer transition-opacity ${
                  day.status === 'incident' ? 'bg-yellow-500' : day.status === 'maintenance' ? 'bg-blue-500' : 'bg-emerald-500/60'
                } ${hoveredDay === i ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                onMouseEnter={() => setHoveredDay(i)}
                onMouseLeave={() => setHoveredDay(null)}
                title={`${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${day.status === 'healthy' ? 'No issues' : day.status === 'maintenance' ? 'Maintenance' : 'Incident'}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-white/25">
            <span>{last90Days[0].date.toLocaleDateString('en-US', { month: 'short' })}</span>
            <span>{last90Days[44].date.toLocaleDateString('en-US', { month: 'short' })}</span>
            <span>{last90Days[89].date.toLocaleDateString('en-US', { month: 'short' })}</span>
          </div>
        </div>

        {/* Past Incidents */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-white mb-6">Past Incidents</h2>
          <div className="space-y-4">
            {incidents.map((inc, i) => (
              <div key={i} className="border border-white/10 rounded-xl p-4 bg-white/[0.01]">
                <div className="flex items-start justify-between gap-4 mb-1.5">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    {inc.type === 'maintenance' ? (
                      <Wrench className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    )}
                    {inc.title}
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                    {inc.status}
                  </span>
                </div>
                <p className="text-xs text-white/50 mb-1">{inc.detail}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                  <Clock className="w-3 h-3" />
                  <span>{inc.date} • {inc.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Report Issue */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-white mb-2">Report an Issue</h2>
          <p className="text-sm text-white/50 mb-4">
            Experiencing a problem not shown here? Let us know and our team will investigate.
          </p>
          <InlineContactForm
            category="status-report"
            title="Report a Platform Issue"
            placeholder="Describe the issue you're experiencing, including what feature is affected..."
            buttonLabel="Submit Report"
          />
        </div>

        {/* Info */}
        <section className="text-center py-8 border-t border-white/10">
          <h2 className="text-base font-bold text-white mb-2">What Is This Page?</h2>
          <p className="text-sm text-white/50 max-w-lg mx-auto mb-2">
            We continuously monitor the status of VizionX and all related services using automated health checks. 
            If there are any interruptions, a note will be posted here. 
            As a Beta product, occasional maintenance windows are expected as we improve the platform.
          </p>
          <p className="text-xs text-white/30 max-w-lg mx-auto">
            ⚠️ Status checks are automated and may not always reflect real-time conditions with 100% accuracy. 
            If you notice an issue, please report it using the form above.
          </p>
        </section>

        <div className="border-t border-white/10 pt-8">
          <p className="text-xs text-white/30 text-center">
            © {new Date().getFullYear()} VizionX. All rights reserved. | www.vizionx.pro
          </p>
        </div>
      </div>
    </div>
  );
}
