import { useState } from 'react';
import { motion } from 'framer-motion';
import { useBudgetPeriods, useBudgetVersions } from '@/lib/hooks/useBudgets';
import { 
  useCreateBudgetVersion, 
  useUpdateBudgetVersion, 
  useDeleteBudgetVersion 
} from '@/lib/hooks/useBudgetMutations';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import type { BudgetVersion } from '@/lib/types/budgets';
import { ApiError } from '@/lib/api/client';

export default function BudgetVersionTab() {
  const { user } = useAuth();
  const { data: periods } = useBudgetPeriods(
    user?.organization_id ? { organization: user.organization_id } : undefined
  );
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const { data: versions, isLoading } = useBudgetVersions(
    selectedPeriodId ? { period: selectedPeriodId } : undefined
  );
  const createMutation = useCreateBudgetVersion();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    version_number: 1,
    is_active: true,
    notes: '',
  });

  const handleCreate = async () => {
    const errors: string[] = [];
    if (!selectedPeriodId) errors.push('Select a period first');
    if (!formData.name.trim()) errors.push('Version name is required');
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    try {
      await createMutation.mutateAsync({
        period_id: selectedPeriodId,
        ...formData,
      });
      setFormData({
        name: '',
        version_number: 1,
        is_active: true,
        notes: '',
      });
      setIsCreating(false);
    } catch (error) {
      if (error instanceof ApiError) {
        const messages = Object.entries(error.errors)
          .map(([k, v]) => `${k}: ${v.join(', ')}`)
          .join('\n');
        alert(messages || 'Failed to create version');
      } else {
        alert('Failed to create version');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="widget-card">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Select Period
        </label>
        <select
          value={selectedPeriodId}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="">-- Choose a period --</option>
          {periods?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (FY{p.fiscal_year}) - {p.status}
            </option>
          ))}
        </select>
      </div>

      {/* Create Form */}
      {selectedPeriodId && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="widget-card border-l-4 border-primary/30"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Version
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
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Version name (e.g., Original, Revised, Final)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-sm"
                />
                <Input
                  type="number"
                  placeholder="Version number"
                  value={formData.version_number}
                  onChange={(e) => setFormData({ ...formData, version_number: e.target.value === '' ? 0 : parseInt(e.target.value, 10) })}
                  className="text-sm"
                />
              </div>
              <Input
                placeholder="Notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="text-sm"
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span className="text-xs font-medium text-foreground">Active</span>
                </label>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="text-xs ml-auto"
                  size="sm"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsCreating(true)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" /> New Version
            </Button>
          )}
        </motion.div>
      )}

      {/* Versions List */}
      <div className="space-y-2">
        {!selectedPeriodId ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Select a period to view versions.
          </div>
        ) : isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Loading versions...
          </div>
        ) : !versions || versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No versions for this period yet.
          </div>
        ) : (
          versions.map((version) => (
            <VersionRow key={version.id} version={version} />
          ))
        )}
      </div>
    </div>
  );
}

function VersionRow({ version }: { version: BudgetVersion }) {
  const updateMutation = useUpdateBudgetVersion(version.id);
  const deleteMutation = useDeleteBudgetVersion(version.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(version);

  const handleUpdate = async () => {
    try {
      await updateMutation.mutateAsync({
        name: editData.name,
        version_number: editData.version_number,
        is_active: editData.is_active,
        notes: editData.notes,
      });
      setIsEditing(false);
    } catch (error) {
      alert('Failed to update version');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this version?')) {
      try {
        await deleteMutation.mutateAsync();
      } catch (error) {
        alert('Failed to delete version');
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
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="text-xs"
              placeholder="Name"
            />
            <Input
              type="number"
              value={editData.version_number}
              onChange={(e) => setEditData({ ...editData, version_number: e.target.value === '' ? 0 : parseInt(e.target.value, 10) })}
              className="text-xs"
              placeholder="Version number"
            />
          </div>
          <Input
            value={editData.notes}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
            className="text-xs"
            placeholder="Notes"
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={editData.is_active}
                onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                className="rounded border-border"
              />
              Active
            </label>
            <div className="flex gap-1 ml-auto">
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
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="widget-card p-4 flex items-center justify-between group hover:bg-secondary/30 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-foreground truncate">{version.name}</h4>
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium whitespace-nowrap">
            v{version.version_number}
          </span>
          {version.is_active && (
            <span className="text-xs px-2 py-1 rounded-full bg-green/10 text-green-600 font-medium whitespace-nowrap">
              Active
            </span>
          )}
        </div>
        {version.notes && (
          <p className="text-xs text-muted-foreground">{version.notes}</p>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          title="Edit version"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete version"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
