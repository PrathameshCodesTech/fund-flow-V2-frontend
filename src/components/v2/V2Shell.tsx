import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ShellUtilityBar } from "@/components/v2/ShellUtilityBar";
import { ShellContextBar } from "@/components/v2/ShellContextBar";
import { CommandPalette } from "@/components/v2/CommandPalette";
import { V2Footer } from "@/components/v2/V2Footer";
import { NAV_GROUPS, itemsForGroup, visibleGroups, type NavGroup } from "@/lib/shell/nav";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";

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
                  const isActive =
                    to === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(to);
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
        <ShellUtilityBar
          onSearchClick={() => setCommandOpen(true)}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <ShellContextBar
          title={title}
          titleIcon={titleIcon}
          breadcrumbs={breadcrumbs}
          orgSelector={orgSelector}
          unitSelector={unitSelector}
          actions={actions}
        />

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">

          {/* Mobile backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar — overlay on mobile, static on desktop */}
          <aside
            className={cn(
              "flex flex-col border-r border-border bg-sidebar z-50 transition-transform duration-300",
              "fixed inset-y-0 left-0 w-64 lg:relative lg:inset-auto lg:w-52 lg:translate-x-0 lg:z-auto lg:shrink-0",
              sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            )}
          >
            {/* Mobile close header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
              <div className="flex items-center gap-2">
                <img src="/vims-brand.png" alt="VIMS" className="h-7 w-auto object-contain" />
                <span className="text-sm font-bold text-primary">VIMS</span>
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

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-secondary/5">
            {children}
          </main>
        </div>

        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
        />
      </div>

      <V2Footer />
    </div>
  );
}
