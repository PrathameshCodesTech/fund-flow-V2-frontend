import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getMyVendor } from "@/lib/api/v2vendor";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
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

const queryClient = new QueryClient();

// Public vendor token routes — always accessible regardless of auth state.
// Both unauthenticated vendors AND authenticated internal users (e.g. finance team)
// opening an onboarding/finance link while already logged in must reach these pages.
const PUBLIC_VENDOR_ROUTES = (
  <Routes>
    <Route path="/vendor/register" element={<VendorRegistrationPage />} />
    <Route path="/vendor/activate/:uid/:token" element={<VendorActivatePage />} />
    <Route path="/vendor/onboarding/:token" element={<VendorOnboardingPage />} />
    <Route path="/vendor/finance/:token" element={<VendorFinanceActionPage />} />
    <Route path="/finance/review/:token" element={<FinanceReviewPage />} />
    <Route path="/activate/:uid/:token" element={<ActivatePage />} />
  </Routes>
);

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const vendorAccount = useQuery({
    queryKey: ["v2", "vendor", "route-guard", "my-vendor"],
    queryFn: getMyVendor,
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60_000,
  });

  // While restoring session from token, show nothing to avoid flashing login
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Public vendor token pages take priority regardless of auth state.
  // This ensures an authenticated internal user opening a finance/onboarding link
  // reaches the correct public page instead of the authenticated shell.
  const publicVendorMatch =
    location.pathname.startsWith("/vendor/activate") ||
    location.pathname.startsWith("/vendor/onboarding") ||
    location.pathname.startsWith("/vendor/finance") ||
    location.pathname.startsWith("/finance/review");

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

  if (publicVendorMatch) {
    return PUBLIC_VENDOR_ROUTES;
  }

  if (vendorAccount.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (vendorAccount.isSuccess) {
    return (
      <Routes>
        <Route path="/vendor-portal" element={<VendorPortalPage />} />
        <Route path="*" element={<VendorPortalPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<V2HomePage />} />
      <Route path="/scope-nodes" element={<ScopeNodesPage />} />
      <Route path="/access-control" element={<AccessControlPage />} />
      <Route path="/workflow-config" element={<WorkflowConfigPage />} />
      <Route path="/invoices" element={<InvoicesPage />} />
      <Route path="/invoices/:id/control-tower" element={<InvoiceControlTowerPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/module-activation" element={<ModuleActivationPage />} />
      <Route path="/budgets" element={<BudgetsPage />} />
      <Route path="/campaigns" element={<CampaignsPage />} />
      <Route path="/vendors" element={<VendorsPage />} />
      <Route path="/vendor-portal" element={<VendorPortalPage />} />
      <Route path="/workflow-drafts/:instanceId/assign" element={<WorkflowDraftAssignPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/finance-handoffs" element={<FinanceHandoffsPage />} />
      <Route path="/people" element={<PeoplePage />} />
      <Route path="/insights" element={<InsightsPage />} />
      <Route path="*" element={<V2HomePage />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppRoutes />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
