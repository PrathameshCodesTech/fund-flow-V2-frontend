import { useState } from 'react';
import { motion } from 'framer-motion';
import { useBudgetPeriods } from '@/lib/hooks/useBudgets';
import { 
  useCreateBudgetPeriod, 
  useUpdateBudgetPeriod, 
  useDeleteBudgetPeriod 
} from '@/lib/hooks/useBudgetMutations';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import type { BudgetPeriod } from '@/lib/types/budgets';
import { ApiError } from '@/lib/api/client';

export default function BudgetPeriodTab() {
  const { user } = useAuth();
  const { data: periods, isLoading } = useBudgetPeriods(
    user?.organization_id ? { organization: user.organization_id } : undefined
  );
  const createMutation = useCreateBudgetPeriod();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    fiscal_year: new Date().getFullYear(),
    period_type: 'annual',
    start_date: '',
    end_date: '',
    status: 'draft',
  });

  const handleCreate = async () => {
    const errors: string[] = [];
    if (!user?.organization_id) errors.push('organization_id is not available (check user login)');
    if (!formData.name.trim()) errors.push('name is required');
    if (!formData.start_date) errors.push('start_date is required');
    if (!formData.end_date) errors.push('end_date is required');
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    try {
      await createMutation.mutateAsync({
        organization_id: user.organization_id,
        ...formData,
      });
      setFormData({
        name: '',
        fiscal_year: new Date().getFullYear(),
        period_type: 'annual',
        start_date: '',
        end_date: '',
        status: 'draft',
      });
      setIsCreating(false);
    } catch (error) {
      if (error instanceof ApiError) {
        const messages = Object.entries(error.errors)
          .map(([k, v]) => `${k}: ${v.join(', ')}`)
          .join('\n');
        alert(messages || 'Failed to create budget period');
      } else {
        alert('Failed to create budget period');
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading budget periods...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create Form */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="widget-card border-l-4 border-primary/30"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Budget Period
          </h3>
          {isCreating && (
            <button 
              onClick={() => setIsCreating(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          )}
        </div>

        {isCreating ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Input
              placeholder="Period name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Fiscal year"
                value={formData.fiscal_year}
                onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value === '' ? 0 : parseInt(e.target.value, 10) })}
                className="text-sm"
              />
              <select
                value={formData.period_type}
                onChange={(e) => setFormData({ ...formData, period_type: e.target.value })}
                className="px-2 py-1 rounded-lg border border-border bg-card text-xs"
              >
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Start date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="text-sm"
              />
              <Input
                type="date"
                placeholder="End date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="text-sm"
              />
            </div>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="px-2 py-1 rounded-lg border border-border bg-card text-xs"
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="locked">Locked</option>
              <option value="closed">Closed</option>
            </select>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="text-xs"
              size="sm"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setIsCreating(true)}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" /> New Period
          </Button>
        )}
      </motion.div>

      {/* Periods List */}
      <div className="space-y-2">
        {!periods || periods.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No budget periods yet. Create one to get started.
          </div>
        ) : (
          periods.map((period) => (
            <PeriodRow key={period.id} period={period} />
          ))
        )}
      </div>
    </div>
  );
}

function PeriodRow({ period }: { period: BudgetPeriod }) {
  const updateMutation = useUpdateBudgetPeriod(period.id);
  const deleteMutation = useDeleteBudgetPeriod(period.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(period);

  const handleUpdate = async () => {
    try {
      await updateMutation.mutateAsync({
        name: editData.name,
        fiscal_year: editData.fiscal_year,
        period_type: editData.period_type,
        start_date: editData.start_date,
        end_date: editData.end_date,
        status: editData.status,
      });
      setIsEditing(false);
    } catch (error) {
      alert('Failed to update budget period');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this budget period?')) {
      try {
        await deleteMutation.mutateAsync();
      } catch (error) {
        alert('Failed to delete budget period');
      }
    }
  };

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="widget-card border-l-2 border-primary/50 p-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <Input
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="text-xs"
            placeholder="Name"
          />
          <Input
            type="number"
            value={editData.fiscal_year}
            onChange={(e) => setEditData({ ...editData, fiscal_year: e.target.value === '' ? 0 : parseInt(e.target.value, 10) })}
            className="text-xs"
            placeholder="FY"
          />
          <Input
            type="date"
            value={editData.start_date}
            onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
            className="text-xs"
          />
          <Input
            type="date"
            value={editData.end_date}
            onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
            className="text-xs"
          />
          <div className="flex gap-1">
            <button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="px-2 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-xs font-medium text-primary transition-colors"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="widget-card p-4 flex items-center justify-between group hover:bg-secondary/30 transition-colors cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-foreground truncate">{period.name}</h4>
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium whitespace-nowrap">
            FY{period.fiscal_year}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-secondary/50 text-muted-foreground font-medium whitespace-nowrap">
            {period.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {period.period_type} • {period.start_date} to {period.end_date}
        </p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          title="Edit period"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete period"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
