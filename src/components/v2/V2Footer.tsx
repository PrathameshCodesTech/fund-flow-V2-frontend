import { currentYear } from "@/lib/config/appMeta";

export function V2Footer() {
  return (
    <footer className="shrink-0 border-t border-primary/10 bg-primary/5 px-6 py-3">
      <div className="flex items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <img src="/vims-brand.png" alt="VIMS" className="h-8 w-auto object-contain" />
          <div className="flex flex-col gap-0">
            <span className="text-[12px] font-black tracking-tight text-primary leading-none">VIMS</span>
            <span className="text-[9px] text-muted-foreground/50 leading-none mt-0.5 tracking-wide uppercase">Vendor Invoice Management System</span>
          </div>
        </div>

        {/* Center nav links */}
        <div className="flex items-center gap-5 text-[11px] text-muted-foreground/60">
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
          <span>&copy; {currentYear} VIMS. All rights reserved.</span>
        </div>

      </div>
    </footer>
  );
}
