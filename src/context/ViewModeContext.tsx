import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type ViewMode = 'classic' | 'newui';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | null>(null);

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error('useViewMode must be used within ViewModeProvider');
  return ctx;
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem('viewMode') as ViewMode) || 'classic';
    } catch {
      return 'classic';
    }
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try { localStorage.setItem('viewMode', mode); } catch {}
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}
