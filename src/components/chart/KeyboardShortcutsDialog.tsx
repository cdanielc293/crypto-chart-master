import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SHORTCUT_GROUPS } from '@/hooks/useKeyboardShortcuts';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsDialog({ open, onClose }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(SHORTCUT_GROUPS.map(g => g.title))
  );

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {SHORTCUT_GROUPS.map(group => (
            <div key={group.title} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors"
              >
                {expandedGroups.has(group.title) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {group.title}
              </button>
              {expandedGroups.has(group.title) && (
                <div className="border-t border-border">
                  {group.shortcuts.map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-6 py-2.5 hover:bg-accent/30 transition-colors"
                    >
                      <span className="text-sm text-foreground/80">{shortcut.label}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((k, ki) => (
                          <span key={ki} className="flex items-center gap-1">
                            {ki > 0 && <span className="text-xs text-muted-foreground mx-0.5">+</span>}
                            <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-medium rounded bg-muted border border-border text-foreground/70">
                              {k}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">?</kbd> to open this dialog
        </p>
      </DialogContent>
    </Dialog>
  );
}
