import vizionLogo from '@/assets/vizionx-logo.png';

export default function NewUIView() {
  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Bento grid canvas - empty foundation */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-4 auto-rows-[180px] gap-4 h-full">
          {/* Placeholder cells to show the grid structure */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`rounded-xl border border-dashed border-chart-border/40 bg-card/30 backdrop-blur-sm flex items-center justify-center transition-colors hover:border-primary/30 hover:bg-card/50 ${
                i === 0 ? 'col-span-2 row-span-2' :
                i === 1 ? 'col-span-2' :
                ''
              }`}
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                <div className="w-8 h-8 rounded-lg border border-dashed border-current flex items-center justify-center text-lg">+</div>
                <span className="text-xs font-medium">Widget</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
