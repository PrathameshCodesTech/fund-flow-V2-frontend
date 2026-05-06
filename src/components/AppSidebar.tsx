import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ROLE_LABELS } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Wallet,
  FileText,
  CheckCircle2,
  Megaphone,
  Users,
  BarChart3,
  Settings,
  Building2,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Layers,
  CreditCard,
  Landmark,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { can, canViewReporting, canViewFinanceReporting } from "@/lib/capabilities";
import type { User } from "@/contexts/AuthContext";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  badge?: number;
  /** Single capability string — OR — an arbitrary predicate for compound rules. */
  capability?: string;
  visible?: (user: User | null) => boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard",       icon: LayoutDashboard, path: "/" },
  { label: "Marketing Funds", icon: Wallet,          path: "/funds",      capability: "budget.view" },
  { label: "Budget Config",   icon: Layers,          path: "/budgets/configure", capability: "budget.manage" },
  { label: "Vendor Bills",    icon: FileText,        path: "/bills",      capability: "invoice.view" },
  { label: "Approvals",       icon: CheckCircle2,    path: "/approvals",  capability: "workflow.task.view" },
  { label: "Campaigns",       icon: Megaphone,       path: "/campaigns",  capability: "campaign.view" },
  { label: "Partners",        icon: Users,           path: "/partners",   capability: "vendor.view" },
  // Insights is visible for any reporting-capable user (basic / region / finance / all).
  { label: "Insights",        icon: BarChart3,       path: "/insights",   visible: canViewReporting },
  // Finance is visible for users with finance reporting capability
  { label: "Finance",         icon: CreditCard,      path: "/finance",    visible: canViewFinanceReporting },
  { label: "Finance Handoffs", icon: Landmark,        path: "/finance-handoffs", visible: canViewFinanceReporting },
  { label: "Workflow",         icon: GitBranch,       path: "/workflow",       capability: "workflow.manage" },
  { label: "Settings",        icon: Settings,        path: "/settings",      capability: "iam.manage" },
  { label: "Tenant Admin",    icon: Building2,       path: "/tenant-admin",  capability: "iam.manage" },
];

function isNavItemVisible(item: NavItem, user: User | null): boolean {
  if (item.visible) return item.visible(user);
  if (!item.capability) return true;
  return can(user, item.capability);
}

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const sidebarContent = (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen flex flex-col bg-sidebar border-r border-sidebar-border z-30"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-sm font-display">IF</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="ml-3 overflow-hidden whitespace-nowrap"
              >
                <p className="text-sm font-semibold text-foreground font-display">VIMS</p>
                <p className="text-caption">Vendor Invoice Management System</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Mobile close button */}
        {onMobileClose && (
          <button onClick={onMobileClose} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.filter(item => isNavItemVisible(item, user)).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-sidebar-foreground hover:bg-accent hover:text-foreground"
                }
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && item.badge && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive/10 text-destructive"}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">{user.avatar}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-caption truncate">{ROLE_LABELS[user.role]}</p>
            </div>
            <button onClick={logout} className="text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center py-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block sticky top-0 h-screen">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={onMobileClose}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
