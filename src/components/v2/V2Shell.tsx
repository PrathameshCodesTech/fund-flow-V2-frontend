import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ShellUtilityBar } from "@/components/v2/ShellUtilityBar";
import { ShellContextBar } from "@/components/v2/ShellContextBar";
import { CommandPalette } from "@/components/v2/CommandPalette";
import { V2Footer } from "@/components/v2/V2Footer";
import { NotificationBell } from "@/components/v2/NotificationBell";
import { NAV_GROUPS, itemsForGroup, visibleGroups, type NavGroup } from "@/lib/shell/nav";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { isEmbedSession, isRunningInIframe } from "@/lib/auth/session";
import { Moon, Sun, X } from "lucide-react";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface V2ShellProps {
  title: string;
  titleIcon?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  orgSelector?: ReactNode;
  unitSelector?: ReactNode;
  children: ReactNode;
}

function EmbeddedShellActions() {
  const { user } = useAuth();
  const { mode, colorTheme, toggleMode, setColorTheme } = useTheme();

  return (
    <div className="flex min-w-0 items-center gap-2">
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

      <button
        onClick={toggleMode}
        title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
        className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {mode === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </button>

      <NotificationBell />

      <div className="hidden sm:flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold shrink-0">
          {user?.avatar ?? "??"}
        </div>
        <div className="hidden xl:block">
          <p className="max-w-36 truncate text-sm font-medium text-foreground">{user?.name ?? "User"}</p>
          <p className="max-w-40 truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
        </div>
      </div>

    </div>
  );
}

export function V2Shell({
  title,
  titleIcon,
  actions,
  breadcrumbs,
  orgSelector,
  unitSelector,
  children,
}: V2ShellProps) {
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const embedded = isEmbedSession() && isRunningInIframe();
  const visibleNavItems = NAV_GROUPS.flatMap((group) => itemsForGroup(group.label as NavGroup, user));
  const activeNavTo = visibleNavItems
    .filter((item) =>
      item.to === "/"
        ? location.pathname === "/"
        : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
    )
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;
  const contextActions = embedded ? (
    <>
      {actions}
      <EmbeddedShellActions />
    </>
  ) : (
    actions
  );

  const navContent = (
    <ScrollArea className="flex-1 py-3">
      <nav className="space-y-4 px-2">
        {visibleGroups(user).map((group) => (
          <div key={group.label}>
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {itemsForGroup(group.label as NavGroup, user).map(
                ({ label, to, icon: Icon }) => {
                  const isActive = activeNavTo === to;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "border-primary/35 bg-gradient-to-r from-background via-background to-primary/10 text-foreground font-medium shadow-sm"
                          : "border-transparent text-sidebar-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "")} />
                      {label}
                    </NavLink>
                  );
                },
              )}
            </div>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!embedded && (
            <ShellUtilityBar
              onSearchClick={() => setCommandOpen(true)}
              onMenuClick={() => setSidebarOpen(true)}
            />
        )}

        <ShellContextBar
          title={title}
          titleIcon={titleIcon}
          breadcrumbs={breadcrumbs}
          orgSelector={orgSelector}
          unitSelector={unitSelector}
          actions={contextActions}
        />

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <aside
            className={cn(
              "flex flex-col border-r border-border bg-sidebar z-50 transition-transform duration-300",
              "fixed inset-y-0 left-0 w-64 lg:relative lg:inset-auto lg:w-52 lg:translate-x-0 lg:z-auto lg:shrink-0",
              sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
              <div className="flex items-center gap-2">
                <img src="/hp.jpg" alt="Horizon Industrial Parks" className="h-8 w-auto object-contain" />
                <span className="text-sm font-bold text-primary">Horizon Industrial Parks</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {navContent}
          </aside>

          <main
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              embedded ? "bg-background" : "bg-secondary/5",
            )}
          >
            {children}
          </main>
        </div>

        {!embedded && (
          <CommandPalette
            open={commandOpen}
            onOpenChange={setCommandOpen}
          />
        )}
      </div>

      {!embedded && <V2Footer />}
    </div>
  );
}
