import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  CodeSquare,
  Layers,
  GitBranch,
  AlertCircle,
} from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import BudgetPeriodTab from './budget-config/tabs/BudgetPeriodTab';
import BudgetVersionTab from './budget-config/tabs/BudgetVersionTab';
import BudgetNodeTypeTab from './budget-config/tabs/BudgetNodeTypeTab';
import BudgetNodeTab from './budget-config/tabs/BudgetNodeTab';

export default function BudgetConfigurationPage() {
  const [activeTab, setActiveTab] = useState('periods');
  const { data: user } = useCurrentUser();

  // Check if user has budget.manage capability
  const hasManageCapability = user?.capabilities?.includes('budget.manage');

  if (!hasManageCapability) {
    return (
      <AppLayout 
        title="Budget Configuration" 
        subtitle="Set up budget periods, versions, types, and hierarchy"
      >
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-destructive">Access Denied</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You do not have permission to access budget configuration. Please contact your organization administrator if you believe this is an error.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <AppLayout 
        title="Budget Configuration" 
        subtitle="Set up budget periods, versions, types, and hierarchy"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full max-w-2xl overflow-x-auto">{/* 4-tab list, scrolls on mobile */}
            <TabsTrigger value="periods" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Periods</span>
            </TabsTrigger>
            <TabsTrigger value="versions" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Versions</span>
            </TabsTrigger>
            <TabsTrigger value="types" className="flex items-center gap-2">
              <CodeSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Types</span>
            </TabsTrigger>
            <TabsTrigger value="nodes" className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              <span className="hidden sm:inline">Nodes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="periods" className="mt-6">
            <BudgetPeriodTab />
          </TabsContent>

          <TabsContent value="versions" className="mt-6">
            <BudgetVersionTab />
          </TabsContent>

          <TabsContent value="types" className="mt-6">
            <BudgetNodeTypeTab />
          </TabsContent>

          <TabsContent value="nodes" className="mt-6">
            <BudgetNodeTab />
          </TabsContent>
        </Tabs>
      </AppLayout>
    </>
  );
}
