import { ChartProvider } from '@/context/ChartContext';
import TopToolbar from '@/components/chart/TopToolbar';
import LeftToolbar from '@/components/chart/LeftToolbar';
import TradingChart from '@/components/chart/TradingChart';
import Watchlist from '@/components/chart/Watchlist';

export default function Index() {
  return (
    <ChartProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <TopToolbar />
        <div className="flex flex-1 overflow-hidden">
          <LeftToolbar />
          <TradingChart />
          <Watchlist />
        </div>
      </div>
    </ChartProvider>
  );
}
