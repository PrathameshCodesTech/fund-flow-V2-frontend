import { currentYear } from "@/lib/config/appMeta";

export function V2Footer() {
  return (
    <footer className="shrink-0 border-t border-primary/10 bg-primary/5 px-4 sm:px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">

        {/* Brand */}
        <div className="flex items-center">
          <img src="/hp.jpg" alt="Horizon Industrial Parks" className="h-7 w-auto object-contain" />
        </div>

        {/* Center nav links — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-5 text-[11px] text-muted-foreground/60">
          {[
            "Vendor Onboarding",
            "Invoice Processing",
            "Fund Governance",
            "Campaigns",
          ].map((label) => (
            <span key={label} className="hover:text-primary transition-colors cursor-default">{label}</span>
          ))}
        </div>

        {/* Right: copyright */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/40">
          <span className="w-1 h-1 rounded-full bg-primary/40 inline-block" />
          <span>&copy; {currentYear} Horizon Industrial Parks. All rights reserved.</span>
        </div>

      </div>
    </footer>
  );
}
