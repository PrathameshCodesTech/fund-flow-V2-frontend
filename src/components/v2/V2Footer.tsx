import { currentYear, envLabel, versionLabel } from "@/lib/config/appMeta";

export function V2Footer() {
  return (
    <footer className="shrink-0 border-t border-border/40 bg-secondary/10 px-5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-[11px] font-semibold tracking-wide text-primary">
            InvoFlow
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            Invoice Operations Platform
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
          {envLabel && (
            <span className="font-medium text-muted-foreground/70">{envLabel}</span>
          )}
          {versionLabel && (
            <>
              <span className="text-border/40">·</span>
              <span>v{versionLabel}</span>
            </>
          )}
          <span className="text-border/40">·</span>
          <span>{currentYear}</span>
        </div>
      </div>
    </footer>
  );
}
