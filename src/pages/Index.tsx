import { ChartProvider } from '@/context/ChartContext';
import { ThemeProvider } from '@/context/ThemeContext';
import TopToolbar from '@/components/chart/TopToolbar';
import ReplayControls from '@/components/chart/ReplayControls';
import LeftToolbar from '@/components/chart/LeftToolbar';
import TradingChart from '@/components/chart/TradingChart';
import RightSidebar from '@/components/chart/RightSidebar';

export default function Index() {
  return (
    <ThemeProvider>
      <ChartProvider>
        <div className="flex flex-col h-full w-full overflow-hidden">
          <TopToolbar />
          <ReplayControls />
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <LeftToolbar />
            <TradingChart />
            <RightSidebar />
          </div>
        </div>
      </ChartProvider>
    </ThemeProvider>
  );
}
