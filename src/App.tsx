import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { hasRouteAccess, NAV_ITEMS, KNOWN_PUBLIC_ROUTES } from "@/lib/shell/nav";
import LoginPage from "./pages/LoginPage.tsx";
import V2HomePage from "./pages/V2HomePage.tsx";
import ScopeNodesPage from "./pages/ScopeNodesPage.tsx";
import AccessControlPage from "./pages/AccessControlPage.tsx";
import WorkflowConfigPage from "./pages/WorkflowConfigPage.tsx";
import InvoicesPage from "./pages/InvoicesPage.tsx";
import InvoiceControlTowerPage from "./pages/InvoiceControlTowerPage.tsx";
import TasksPage from "./pages/TasksPage.tsx";
import InsightsPage from "./pages/InsightsPage.tsx";
import ModuleActivationPage from "./pages/ModuleActivationPage.tsx";
import VendorRegistrationPage from "./pages/VendorRegistrationPage.tsx";
import VendorActivatePage from "./pages/VendorActivatePage.tsx";
import ActivatePage from "./pages/ActivatePage.tsx";
import WorkflowDraftAssignPage from "./pages/WorkflowDraftAssignPage.tsx";
import NotificationsPage from "./pages/NotificationsPage.tsx";
import BudgetsPage from "./pages/BudgetsPage.tsx";
import CampaignsPage from "./pages/CampaignsPage.tsx";
import VendorsPage from "./pages/VendorsPage.tsx";
import VendorOnboardingPage from "./pages/VendorOnboardingPage.tsx";
import VendorFinanceActionPage from "./pages/VendorFinanceActionPage.tsx";
import VendorPortalPage from "./pages/VendorPortalPage.tsx";
import FinanceHandoffsPage from "./pages/FinanceHandoffsPage.tsx";
import FinanceReviewPage from "./pages/FinanceReviewPage.tsx";
import PeoplePage from "./pages/PeoplePage.tsx";
import ForbiddenPage from "./pages/ForbiddenPage.tsx";

const queryClient = new QueryClient();

// ── Route guard ───────────────────────────────────────────────────────────────

function GuardedRoute({
  navPath,
  element,
}: {
  navPath: string;
  element: React.ReactElement;
}) {
  const { user } = useAuth();
  const userRoles = user?.roles ?? [];
  if (!hasRouteAccess(userRoles, navPath)) {
    return <ForbiddenPage />;
  }
  return element;
}

/** Forbidden when non-vendor tries to open the vendor portal. */
function VendorPortalGuard({
  element,
}: {
  element: React.ReactElement;
}) {
  const { user } = useAuth();
  if (user?.isVendorPortalUser) return element;
  return <ForbiddenPage />;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function defaultRoute(userRoles: string[]): string {
  for (const item of NAV_ITEMS) {
    if (hasRouteAccess(userRoles, item.to)) return item.to;
  }
  return "/";
}

function isPublicRoute(pathname: string): boolean {
  return KNOWN_PUBLIC_ROUTES.some((p) => pathname.startsWith(p));
}

// ── AppRoutes ────────────────────────────────────────────────────────────────

function AppRoutes() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const userRoles = user?.roles ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/vendor/register" element={<VendorRegistrationPage />} />
        <Route path="/vendor/activate/:uid/:token" element={<VendorActivatePage />} />
        <Route path="/vendor/onboarding/:token" element={<VendorOnboardingPage />} />
        <Route path="/vendor/finance/:token" element={<VendorFinanceActionPage />} />
        <Route path="/finance/review/:token" element={<FinanceReviewPage />} />
        <Route path="/activate/:uid/:token" element={<ActivatePage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  if (isPublicRoute(location.pathname)) {
    return (
      <Routes>
        <Route path="/vendor/register" element={<VendorRegistrationPage />} />
        <Route path="/vendor/activate/:uid/:token" element={<VendorActivatePage />} />
        <Route path="/vendor/onboarding/:token" element={<VendorOnboardingPage />} />
        <Route path="/vendor/finance/:token" element={<VendorFinanceActionPage />} />
        <Route path="/finance/review/:token" element={<FinanceReviewPage />} />
        <Route path="/activate/:uid/:token" element={<ActivatePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // ── Vendor portal user → vendor portal only ────────────────────────────────
  if (user?.isVendorPortalUser) {
    return (
      <Routes>
        <Route path="/vendor-portal" element={<VendorPortalPage />} />
        <Route
          path="*"
          element={<Navigate to="/vendor-portal" replace />}
        />
      </Routes>
    );
  }

  // ── Internal user → internal shell ─────────────────────────────────────────
  const fallback = defaultRoute(userRoles);

  return (
    <Routes>
      {/* Root redirect to first allowed nav item */}
      <Route path="/" element={<GuardedRoute navPath="/" element={<V2HomePage />} />} />

      {/* Operations */}
      <Route path="/invoices" element={<GuardedRoute navPath="/invoices" element={<InvoicesPage />} />} />
      <Route
        path="/invoices/:id/control-tower"
        element={<GuardedRoute navPath="/invoices" element={<InvoiceControlTowerPage />} />}
      />
      <Route path="/tasks" element={<GuardedRoute navPath="/tasks" element={<TasksPage />} />} />
      <Route
        path="/finance-handoffs"
        element={<GuardedRoute navPath="/finance-handoffs" element={<FinanceHandoffsPage />} />}
      />
      <Route path="/vendors" element={<GuardedRoute navPath="/vendors" element={<VendorsPage />} />} />
      <Route path="/campaigns" element={<GuardedRoute navPath="/campaigns" element={<CampaignsPage />} />} />

      {/* Planning */}
      <Route path="/budgets" element={<GuardedRoute navPath="/budgets" element={<BudgetsPage />} />} />
      <Route path="/insights" element={<GuardedRoute navPath="/insights" element={<InsightsPage />} />} />

      {/* Setup */}
      <Route path="/people" element={<GuardedRoute navPath="/people" element={<PeoplePage />} />} />
      <Route
        path="/scope-nodes"
        element={<GuardedRoute navPath="/scope-nodes" element={<ScopeNodesPage />} />}
      />
      <Route
        path="/access-control"
        element={<GuardedRoute navPath="/access-control" element={<AccessControlPage />} />}
      />
      <Route
        path="/workflow-config"
        element={<GuardedRoute navPath="/workflow-config" element={<WorkflowConfigPage />} />}
      />
      <Route
        path="/module-activation"
        element={<GuardedRoute navPath="/module-activation" element={<ModuleActivationPage />} />}
      />

      {/* Non-nav internal routes */}
      <Route
        path="/notifications"
        element={<GuardedRoute navPath="/notifications" element={<NotificationsPage />} />}
      />
      <Route
        path="/workflow-drafts/:instanceId/assign"
        element={
          <GuardedRoute
            navPath="/workflow-drafts/:instanceId/assign"
            element={<WorkflowDraftAssignPage />}
          />
        }
      />

      {/* Vendor portal — forbidden for internal users */}
      <Route path="/vendor-portal" element={<VendorPortalGuard element={<VendorPortalPage />} />} />

      {/* Catch-all: unknown internal route → first allowed or Forbidden */}
      <Route path="*" element={<Navigate to={fallback} replace />} />
    </Routes>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
            >
              <AppRoutes />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
