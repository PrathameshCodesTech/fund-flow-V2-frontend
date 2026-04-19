import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Bell, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotifications, NotificationPanel } from "@/contexts/NotificationContext";
import { GlobalSearch } from "@/components/GlobalSearch";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { mode, toggleMode } = useTheme();
  const { unreadCount, setShowNotificationPanel, showNotificationPanel } = useNotifications();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-8 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              {title && <h1 className="text-base sm:text-lg font-semibold text-foreground font-display">{title}</h1>}
              {subtitle && <p className="text-caption hidden sm:block">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <GlobalSearch />
            <button
              onClick={toggleMode}
              className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
            >
              {mode === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive border-2 border-card flex items-center justify-center">
                  <span className="text-[9px] font-bold text-destructive-foreground">{unreadCount > 9 ? "9+" : unreadCount}</span>
                </span>
              )}
            </button>
          </div>
        </header>
        <NotificationPanel />
        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
