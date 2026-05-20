import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { NotificationBell } from "@/components/v2/NotificationBell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, Command, LogOut, Moon, Sun, Menu } from "lucide-react";

interface ShellUtilityBarProps {
  onSearchClick: () => void;
  onMenuClick: () => void;
}

export function ShellUtilityBar({ onSearchClick, onMenuClick }: ShellUtilityBarProps) {
  const { user, logout } = useAuth();
  const { mode, colorTheme, toggleMode, setColorTheme } = useTheme();

  return (
    <header className="flex items-center justify-between border-b border-border px-3 sm:px-5 py-2.5 gap-3 sm:gap-6">

      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Left: Organization brand — hidden on mobile */}
      <div className="hidden lg:flex shrink-0 items-center gap-2.5">
        <img src="/vims-brand.png" alt="VIMS" className="h-8 w-auto object-contain" />
        <div className="border-l border-border pl-2.5">
          <p className="text-sm font-bold tracking-tight text-foreground leading-none">HORIZON</p>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
            INDUSTRIAL PARKS
          </p>
        </div>
      </div>

      {/* Center: Product title */}
      <div className="hidden md:flex flex-1 justify-center">
        <h1 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
          Vendor Invoice Management
        </h1>
      </div>

      {/* Right: Search + controls */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 md:flex-none justify-end">
        {/* Compact search */}
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/70 bg-secondary/50 hover:bg-secondary text-sm text-muted-foreground hover:text-foreground transition-all"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:block text-xs">Search pages, actions...</span>
          <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[9px] font-medium text-muted-foreground border border-border/50 shrink-0">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>

        {/* Color theme toggle — hidden on small screens */}
        <div className="hidden sm:flex items-center rounded-md border border-border bg-secondary/50 p-0.5 gap-0.5">
          <button
            onClick={() => setColorTheme("orange")}
            title="Orange theme"
            className={cn(
              "h-6 w-6 rounded flex items-center justify-center transition-all",
              colorTheme === "orange"
                ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                : "hover:bg-primary/10",
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
          </button>
          <button
            onClick={() => setColorTheme("green")}
            title="Green theme"
            className={cn(
              "h-6 w-6 rounded flex items-center justify-center transition-all",
              colorTheme === "green"
                ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                : "hover:bg-primary/10",
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </button>
        </div>

        {/* Light / dark toggle */}
        <button
          onClick={toggleMode}
          title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {mode === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </button>

        <NotificationBell />

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold shrink-0">
            {user?.avatar ?? "??"}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{user?.name ?? "User"}</p>
            <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          className="gap-1.5 text-muted-foreground"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
