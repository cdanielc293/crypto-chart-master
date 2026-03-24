import { ChartProvider, useChart } from '@/context/ChartContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ViewModeProvider, useViewMode } from '@/context/ViewModeContext';
import TopToolbar from '@/components/chart/TopToolbar';
import ReplayControls from '@/components/chart/ReplayControls';
import LeftToolbar from '@/components/chart/LeftToolbar';
import TradingChart from '@/components/chart/TradingChart';
import RightSidebar from '@/components/chart/RightSidebar';
import FavoritesToolbar from '@/components/chart/FavoritesToolbar';
import FeedbackWidgets from '@/components/chart/FeedbackWidgets';
import KeyboardShortcutsDialog from '@/components/chart/KeyboardShortcutsDialog';
import SessionDisconnectedDialog from '@/components/chart/SessionDisconnectedDialog';
import SecurityAlertDialog from '@/components/chart/SecurityAlertDialog';
import WelcomeOnboardingDialog from '@/components/chart/WelcomeOnboardingDialog';
import NewUIView from '@/components/chart/NewUIView';
import { getCellStyle } from '@/types/layout';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSessionEnforcement } from '@/hooks/useSessionEnforcement';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    disconnected,
    disconnectInfo,
    ipAlert,
    reconnect,
    dismissIpAlert,
  } = useSessionEnforcement();

  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handler = () => setShowShortcuts(true);
    window.addEventListener('shortcut:show-shortcuts', handler);
    return () => window.removeEventListener('shortcut:show-shortcuts', handler);
  }, []);

  const handleIpNotMe = async () => {
    dismissIpAlert(false);
    // Log all sessions out except current
    try {
      await supabase.auth.signOut({ scope: 'others' });
    } catch {}
    // Redirect to settings to change password
    navigate('/settings');
  };

  // Block native browser context menu on the entire chart page
  useEffect(() => {
    const blockContextMenu = (e: MouseEvent) => {
      // Allow context menu on actual input/textarea elements
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
    };
    document.addEventListener('contextmenu', blockContextMenu);
    return () => document.removeEventListener('contextmenu', blockContextMenu);
  }, []);

  return (
    <>
      <div className="flex flex-col h-screen w-full overflow-hidden">
        <TopToolbar />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <LeftToolbar />
          <ChartArea />
          <RightSidebar />
        </div>
        <ReplayControls />
        <FeedbackWidgets />
      </div>
      <FavoritesToolbar />
      <KeyboardShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <SessionDisconnectedDialog
        open={disconnected}
        info={disconnectInfo}
        onConnect={reconnect}
      />
      <SecurityAlertDialog
        open={!!ipAlert}
        info={ipAlert}
        onConfirmMe={() => dismissIpAlert(true)}
        onNotMe={handleIpNotMe}
      />
      <WelcomeOnboardingDialog />
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
