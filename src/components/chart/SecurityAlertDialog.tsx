import { ShieldAlert, AlertTriangle } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import type { IpAlertInfo } from '@/hooks/useSessionEnforcement';

interface Props {
  open: boolean;
  info: IpAlertInfo | null;
  onConfirmMe: () => void;
  onNotMe: () => void;
}

export default function SecurityAlertDialog({ open, info, onConfirmMe, onNotMe }: Props) {
  if (!open || !info) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-destructive/30 bg-toolbar-bg shadow-2xl overflow-hidden">
        {/* Red warning header */}
        <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-4 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-destructive flex-shrink-0" />
          <div>
            <img src={vizionLogo} alt="VizionX" className="h-4 mb-1 opacity-60" />
            <h2 className="text-base font-bold text-destructive">Security Alert</h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground leading-relaxed">
              <p className="font-semibold mb-1">Suspicious login detected!</p>
              <p className="text-muted-foreground text-xs">
                We detected a login to your account from a different IP address.
                Sharing your account is strictly prohibited and may result in
                account suspension.
              </p>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Previous IP:</span>
              <span className="text-foreground font-mono">{info.previousIp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current IP:</span>
              <span className="text-foreground font-mono">{info.currentIp}</span>
            </div>
          </div>

          <p className="text-sm text-foreground font-medium">
            Did you log in from another device?
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onConfirmMe}
            className="flex-1 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium text-sm hover:bg-primary/20 transition-colors"
          >
            Yes, it was me
          </button>
          <button
            onClick={onNotMe}
            className="flex-1 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive font-medium text-sm hover:bg-destructive/20 transition-colors"
          >
            No, secure my account
          </button>
        </div>
      </div>
    </div>
  );
}
