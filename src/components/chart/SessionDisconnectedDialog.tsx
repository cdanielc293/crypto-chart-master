import { Monitor, Smartphone, X } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import type { SessionDisconnectInfo } from '@/hooks/useSessionEnforcement';

interface Props {
  open: boolean;
  info: SessionDisconnectInfo | null;
  onConnect: () => void;
}

export default function SessionDisconnectedDialog({ open, info, onConnect }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-chart-border bg-toolbar-bg shadow-2xl overflow-hidden">
        {/* Header with logo */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <div className="w-16 h-16 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-4">
            <div className="relative">
              <Monitor className="w-8 h-8 text-destructive" />
              <Smartphone className="w-4 h-4 text-destructive absolute -bottom-1 -right-2" />
              <X className="w-3 h-3 text-destructive absolute -top-1 -right-1 bg-toolbar-bg rounded-full" />
            </div>
          </div>

          <img src={vizionLogo} alt="VizionX" className="h-5 mb-4 opacity-60" />

          <h2 className="text-xl font-bold text-foreground mb-2">Session disconnected</h2>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Your session ended because your account was accessed from another
            browser or device. To comply with market data regulations, only one
            active session is allowed per user.
          </p>

          {info && (
            <div className="space-y-1">
              <p className="text-foreground font-medium text-xs">Details of the device that triggered this disconnection:</p>
              <p className="text-xs">Device: <span className="text-foreground">{info.device}</span></p>
              <p className="text-xs">Browser: <span className="text-foreground">{info.browser}</span></p>
            </div>
          )}

          <p className="text-xs">
            Additional info is available in your{' '}
            <a href="/settings" className="text-primary hover:underline">profile settings</a>.
          </p>

          <p className="text-xs">
            If both sessions were yours, simply click "Connect" to continue.
          </p>
          <p className="text-xs">
            If you don't recognize this activity, please update your password and
            enable two-factor authentication as soon as possible.
          </p>
        </div>

        {/* Connect button */}
        <div className="px-6 pb-6 flex flex-col items-center gap-3">
          <button
            onClick={onConnect}
            className="w-full max-w-[200px] py-2.5 px-6 rounded-lg bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Connect
          </button>

          <p className="text-[10px] text-muted-foreground">
            Manage your session history in{' '}
            <a href="/settings" className="text-primary hover:underline">Profile settings</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
