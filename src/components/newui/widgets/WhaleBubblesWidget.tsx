// Whale Trades — professional table with mock large-order data
import { TrendingUp, TrendingDown } from 'lucide-react';

const MOCK_WHALE_TRADES = [
  { pair: 'BTC/USDT', side: 'buy', size: '142.5 BTC', value: '$6.12M', time: '2s ago', exchange: 'Binance' },
  { pair: 'ETH/USDT', side: 'sell', size: '3,200 ETH', value: '$8.96M', time: '15s ago', exchange: 'Coinbase' },
  { pair: 'SOL/USDT', side: 'buy', size: '45,000 SOL', value: '$4.28M', time: '32s ago', exchange: 'Bybit' },
  { pair: 'BTC/USDT', side: 'sell', size: '85.2 BTC', value: '$3.66M', time: '1m ago', exchange: 'OKX' },
  { pair: 'ETH/USDT', side: 'buy', size: '1,850 ETH', value: '$5.18M', time: '1m ago', exchange: 'Kraken' },
  { pair: 'XRP/USDT', side: 'buy', size: '2.1M XRP', value: '$1.47M', time: '2m ago', exchange: 'Binance' },
  { pair: 'BTC/USDT', side: 'buy', size: '210.0 BTC', value: '$9.03M', time: '3m ago', exchange: 'Bitfinex' },
  { pair: 'DOGE/USDT', side: 'sell', size: '12M DOGE', value: '$1.92M', time: '4m ago', exchange: 'Binance' },
];

export default function WhaleBubblesWidget() {
  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="text-white/25 uppercase tracking-wider text-[9px] border-b border-white/[0.04]">
            <th className="text-left py-1.5 px-2 font-medium">Pair</th>
            <th className="text-left py-1.5 px-1 font-medium">Side</th>
            <th className="text-right py-1.5 px-1 font-medium">Size</th>
            <th className="text-right py-1.5 px-1 font-medium">Value</th>
            <th className="text-right py-1.5 px-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_WHALE_TRADES.map((t, i) => (
            <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
              <td className="py-1.5 px-2 text-white/70">{t.pair}</td>
              <td className="py-1.5 px-1">
                <span className={`inline-flex items-center gap-0.5 ${t.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.side === 'buy' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {t.side.toUpperCase()}
                </span>
              </td>
              <td className="py-1.5 px-1 text-right text-white/50">{t.size}</td>
              <td className="py-1.5 px-1 text-right text-white/70 font-semibold">{t.value}</td>
              <td className="py-1.5 px-2 text-right text-white/25">{t.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
