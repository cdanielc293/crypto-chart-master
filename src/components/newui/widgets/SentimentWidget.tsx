// AI Sentiment — professional heatmap grid with mock scores
const ASSETS = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'LINK', 'MATIC'];
const TIMEFRAMES = ['1H', '4H', '1D', '1W'];

// Deterministic mock sentiment scores
function getScore(asset: string, tf: string): number {
  const hash = (asset.charCodeAt(0) * 7 + asset.charCodeAt(1) * 13 + tf.charCodeAt(0) * 3) % 100;
  return hash - 50; // -50 to +50
}

function scoreColor(score: number): string {
  if (score > 30) return 'rgba(16,185,129,0.7)';
  if (score > 10) return 'rgba(16,185,129,0.35)';
  if (score > -10) return 'rgba(255,255,255,0.06)';
  if (score > -30) return 'rgba(239,68,68,0.35)';
  return 'rgba(239,68,68,0.7)';
}

function scoreText(score: number): string {
  if (score > 30) return 'text-emerald-400';
  if (score > 10) return 'text-emerald-400/60';
  if (score > -10) return 'text-white/30';
  if (score > -30) return 'text-red-400/60';
  return 'text-red-400';
}

export default function SentimentWidget() {
  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-[10px] font-mono">
        <thead>
          <tr className="text-white/20 uppercase tracking-wider text-[8px]">
            <th className="text-left py-1 px-2 font-medium">Asset</th>
            {TIMEFRAMES.map(tf => (
              <th key={tf} className="text-center py-1 px-1 font-medium">{tf}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ASSETS.map(asset => (
            <tr key={asset} className="border-b border-white/[0.02]">
              <td className="py-1 px-2 text-white/60 font-semibold">{asset}</td>
              {TIMEFRAMES.map(tf => {
                const score = getScore(asset, tf);
                return (
                  <td key={tf} className="py-1 px-1 text-center">
                    <div
                      className="rounded px-1.5 py-0.5 inline-block min-w-[32px]"
                      style={{ background: scoreColor(score) }}
                    >
                      <span className={`text-[9px] font-bold ${scoreText(score)}`}>
                        {score > 0 ? '+' : ''}{score}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
