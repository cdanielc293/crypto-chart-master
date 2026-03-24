import { ChartProvider, useChart } from '@/context/ChartContext';
import { ThemeProvider } from '@/context/ThemeContext';
import TopToolbar from '@/components/chart/TopToolbar';
import ReplayControls from '@/components/chart/ReplayControls';
import LeftToolbar from '@/components/chart/LeftToolbar';
import TradingChart from '@/components/chart/TradingChart';
import RightSidebar from '@/components/chart/RightSidebar';
import FeedbackWidgets from '@/components/chart/FeedbackWidgets';
import KeyboardShortcutsDialog from '@/components/chart/KeyboardShortcutsDialog';
import { getCellStyle } from '@/types/layout';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useState, useEffect } from 'react';

function ChartArea() {
  const { gridLayout, panelSymbols, setPanelSymbol, syncOptions, symbol } = useChart();

  if (gridLayout.count === 1) {
    return <TradingChart />;
  }

  return (
    <div
      className="w-full h-full bg-chart-border"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
        gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
        gap: '1px',
      }}
    >
      {gridLayout.cells.map((cell, i) => {
        const panelSymbol = syncOptions.symbol ? symbol : (panelSymbols[i] || 'BTCUSDT');
        return (
          <div
            key={`${gridLayout.id}-${i}`}
            style={getCellStyle(cell)}
            className="min-w-0 min-h-0 overflow-hidden"
          >
            <TradingChart
              panelIndex={i}
              overrideSymbol={panelSymbol}
              compact={gridLayout.count > 1}
            />
          </div>
        );
      })}
    </div>
  );
}

function ChartWithShortcuts() {
  useKeyboardShortcuts();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handler = () => setShowShortcuts(true);
    window.addEventListener('shortcut:show-shortcuts', handler);
    return () => window.removeEventListener('shortcut:show-shortcuts', handler);
  }, []);

  return (
    <>
      <div className="flex flex-col h-screen w-full overflow-hidden">
        <TopToolbar />
        <ReplayControls />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <LeftToolbar />
          <ChartArea />
          <RightSidebar />
        </div>
        <FeedbackWidgets />
      </div>
      <KeyboardShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </>
  );
}

export default function ChartPage() {
  return (
    <ThemeProvider>
      <ChartProvider>
        <ChartWithShortcuts />
      </ChartProvider>
    </ThemeProvider>
  );
}
