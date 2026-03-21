import { useState, useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';
import { useChart } from '@/context/ChartContext';

const TIMEZONES = [
  { label: 'UTC', offset: 0 },
  { label: 'Exchange', offset: null },
  { label: '(UTC-10) Honolulu', offset: -10 },
  { label: '(UTC-8) Anchorage', offset: -8 },
  { label: '(UTC-8) Juneau', offset: -8 },
  { label: '(UTC-7) Los Angeles', offset: -7 },
  { label: '(UTC-7) Phoenix', offset: -7 },
  { label: '(UTC-7) Vancouver', offset: -7 },
  { label: '(UTC-6) Denver', offset: -6 },
  { label: '(UTC-6) Mexico City', offset: -6 },
  { label: '(UTC-6) San Salvador', offset: -6 },
  { label: '(UTC-5) Bogota', offset: -5 },
  { label: '(UTC-5) Chicago', offset: -5 },
  { label: '(UTC-5) Lima', offset: -5 },
  { label: '(UTC-4) Caracas', offset: -4 },
  { label: '(UTC-4) New York', offset: -4 },
  { label: '(UTC-4) Toronto', offset: -4 },
  { label: '(UTC-3) Buenos Aires', offset: -3 },
  { label: '(UTC-3) Halifax', offset: -3 },
  { label: '(UTC-3) Santiago', offset: -3 },
  { label: '(UTC-3) Sao Paulo', offset: -3 },
  { label: '(UTC-1) Azores', offset: -1 },
  { label: '(UTC) Casablanca', offset: 0 },
  { label: '(UTC) Dublin', offset: 0 },
  { label: '(UTC) Lisbon', offset: 0 },
  { label: '(UTC) London', offset: 0 },
  { label: '(UTC) Reykjavik', offset: 0 },
  { label: '(UTC+1) Amsterdam', offset: 1 },
  { label: '(UTC+1) Belgrade', offset: 1 },
  { label: '(UTC+1) Berlin', offset: 1 },
  { label: '(UTC+1) Bratislava', offset: 1 },
  { label: '(UTC+1) Brussels', offset: 1 },
  { label: '(UTC+1) Budapest', offset: 1 },
  { label: '(UTC+1) Copenhagen', offset: 1 },
  { label: '(UTC+1) Lagos', offset: 1 },
  { label: '(UTC+1) Ljubljana', offset: 1 },
  { label: '(UTC+1) Luxembourg', offset: 1 },
  { label: '(UTC+1) Madrid', offset: 1 },
  { label: '(UTC+1) Malta', offset: 1 },
  { label: '(UTC+1) Oslo', offset: 1 },
  { label: '(UTC+1) Paris', offset: 1 },
  { label: '(UTC+1) Prague', offset: 1 },
  { label: '(UTC+1) Rome', offset: 1 },
  { label: '(UTC+1) Stockholm', offset: 1 },
  { label: '(UTC+2) Athens', offset: 2 },
  { label: '(UTC+2) Bucharest', offset: 2 },
  { label: '(UTC+2) Cairo', offset: 2 },
  { label: '(UTC+2) Helsinki', offset: 2 },
  { label: '(UTC+2) Istanbul', offset: 2 },
  { label: '(UTC+2) Jerusalem', offset: 2 },
  { label: '(UTC+2) Johannesburg', offset: 2 },
  { label: '(UTC+2) Kyiv', offset: 2 },
  { label: '(UTC+2) Riga', offset: 2 },
  { label: '(UTC+2) Tallinn', offset: 2 },
  { label: '(UTC+2) Vilnius', offset: 2 },
  { label: '(UTC+3) Baghdad', offset: 3 },
  { label: '(UTC+3) Kuwait', offset: 3 },
  { label: '(UTC+3) Moscow', offset: 3 },
  { label: '(UTC+3) Nairobi', offset: 3 },
  { label: '(UTC+3) Riyadh', offset: 3 },
  { label: '(UTC+3:30) Tehran', offset: 3.5 },
  { label: '(UTC+4) Dubai', offset: 4 },
  { label: '(UTC+4) Muscat', offset: 4 },
  { label: '(UTC+4:30) Kabul', offset: 4.5 },
  { label: '(UTC+5) Karachi', offset: 5 },
  { label: '(UTC+5) Tashkent', offset: 5 },
  { label: '(UTC+5:30) Kolkata', offset: 5.5 },
  { label: '(UTC+5:45) Kathmandu', offset: 5.75 },
  { label: '(UTC+6) Almaty', offset: 6 },
  { label: '(UTC+6) Dhaka', offset: 6 },
  { label: '(UTC+7) Bangkok', offset: 7 },
  { label: '(UTC+7) Ho Chi Minh', offset: 7 },
  { label: '(UTC+7) Jakarta', offset: 7 },
  { label: '(UTC+8) Hong Kong', offset: 8 },
  { label: '(UTC+8) Perth', offset: 8 },
  { label: '(UTC+8) Shanghai', offset: 8 },
  { label: '(UTC+8) Singapore', offset: 8 },
  { label: '(UTC+8) Taipei', offset: 8 },
  { label: '(UTC+9) Seoul', offset: 9 },
  { label: '(UTC+9) Tokyo', offset: 9 },
  { label: '(UTC+9:30) Adelaide', offset: 9.5 },
  { label: '(UTC+10) Brisbane', offset: 10 },
  { label: '(UTC+10) Sydney', offset: 10 },
  { label: '(UTC+12) Auckland', offset: 12 },
];

export function getTimezoneOffsetHours(tz: string): number {
  if (tz === 'UTC') return 0;
  if (tz === 'Exchange') return -(new Date().getTimezoneOffset() / 60); // local timezone for crypto
  const entry = TIMEZONES.find(t => t.label === tz);
  return entry?.offset ?? -(new Date().getTimezoneOffset() / 60);
}

export function formatTimeInTimezone(date: Date, offsetHours: number): string {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const adjusted = new Date(utc + offsetHours * 3600000);
  const h = String(adjusted.getHours()).padStart(2, '0');
  const m = String(adjusted.getMinutes()).padStart(2, '0');
  const s = String(adjusted.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function getTimezoneShortLabel(tz: string): string {
  if (tz === 'UTC') return 'UTC';
  if (tz === 'Exchange') return 'Exchange';
  const match = tz.match(/\((UTC[^)]*)\)\s*(.*)/);
  if (match) return `${match[1]}`;
  return tz;
}

export default function TimezoneSelector() {
  const { chartSettings, setChartSettings } = useChart();
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedTz = chartSettings.symbol.timezone;
  const offsetHours = getTimezoneOffsetHours(selectedTz);

  useEffect(() => {
    const tick = () => {
      setClock(formatTimeInTimezone(new Date(), offsetHours));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [offsetHours]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectTimezone = (label: string) => {
    setChartSettings(prev => ({
      ...prev,
      symbol: { ...prev.symbol, timezone: label },
    }));
    localStorage.setItem('chartSettings', JSON.stringify({
      ...chartSettings,
      symbol: { ...chartSettings.symbol, timezone: label },
    }));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5"
        title="Change timezone"
      >
        <span className="font-mono">{clock}</span>
        <span className="text-[11px] opacity-70">{getTimezoneShortLabel(selectedTz)}</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute bottom-full mb-1 right-0 w-64 max-h-[400px] overflow-y-auto rounded-md border bg-[hsl(var(--card))] border-[hsl(var(--border))] shadow-lg z-50"
        >
          {TIMEZONES.map((tz) => (
            <button
              key={tz.label}
              onClick={() => selectTimezone(tz.label)}
              className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-accent hover:text-accent-foreground transition-colors ${
                selectedTz === tz.label ? 'text-primary font-medium' : 'text-foreground'
              }`}
            >
              {tz.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
