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
  const { user } = useAuth();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ShellUtilityBar onSearchClick={() => setCommandOpen(true)} />

        <ShellContextBar
          title={title}
          titleIcon={titleIcon}
          breadcrumbs={breadcrumbs}
          orgSelector={orgSelector}
          unitSelector={unitSelector}
          actions={actions}
        />

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-sidebar">
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
