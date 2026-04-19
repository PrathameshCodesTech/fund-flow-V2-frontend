import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { NotificationBell } from "@/components/v2/NotificationBell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, Command, LogOut, Moon, Sun } from "lucide-react";

interface ShellUtilityBarProps {
  onSearchClick: () => void;
}

export function ShellUtilityBar({ onSearchClick }: ShellUtilityBarProps) {
  const { user, logout } = useAuth();
  const { mode, colorTheme, toggleMode, setColorTheme } = useTheme();

  return (
    <header className="flex items-center justify-between border-b border-border px-5 py-2.5 gap-4">
      {/* Left: InvoFlow brand */}
      <div className="shrink-0">
        <p className="text-xl font-black tracking-tight text-primary leading-none">
          InvoFlow
        </p>
      </div>

      {/* Center: prominent search */}
      <button
        onClick={onSearchClick}
        className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-border/70 bg-secondary/50 hover:bg-secondary text-sm text-muted-foreground hover:text-foreground transition-all flex-1 max-w-2xl mx-auto"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left text-sm">Search pages, actions…</span>
        <kbd className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground border border-border/50 shrink-0">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Color variant toggle */}
        <div className="flex items-center rounded-md border border-border bg-secondary/50 p-0.5 gap-0.5">
          <button
            onClick={() => setColorTheme("blue")}
            title="Blue theme"
            className={cn(
              "h-6 w-6 rounded flex items-center justify-center transition-all",
              colorTheme === "blue"
                ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                : "hover:bg-primary/10",
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
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
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
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
