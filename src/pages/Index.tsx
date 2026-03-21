import { ChartProvider } from '@/context/ChartContext';
import TopToolbar from '@/components/chart/TopToolbar';
import ReplayControls from '@/components/chart/ReplayControls';
import LeftToolbar from '@/components/chart/LeftToolbar';
import TradingChart from '@/components/chart/TradingChart';
import RightSidebar from '@/components/chart/RightSidebar';

export default function Index() {
  return (
    <ChartProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <TopToolbar />
        <ReplayControls />
        <div className="flex flex-1 overflow-hidden">
          <LeftToolbar />
          <TradingChart />
          <RightSidebar />
        </div>
      </div>
    </ChartProvider>
  );
}
