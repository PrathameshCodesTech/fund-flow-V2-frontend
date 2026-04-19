import { useState } from 'react';
import { motion } from 'framer-motion';
import { useBudgetNodeTypes } from '@/lib/hooks/useBudgets';
import { 
  useCreateBudgetNodeType, 
  useUpdateBudgetNodeType, 
  useDeleteBudgetNodeType 
} from '@/lib/hooks/useBudgetMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import { ApiError } from '@/lib/api/client';

export default function BudgetNodeTypeTab() {
  const { data: nodeTypes = [], isLoading } = useBudgetNodeTypes();
  const createMutation = useCreateBudgetNodeType();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    level: 0,
    is_active: true,
  });

  const handleCreate = async () => {
    const errors: string[] = [];
    if (!formData.code.trim()) errors.push('Code is required');
    if (!formData.name.trim()) errors.push('Name is required');
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...formData,
      });
      setFormData({
        code: '',
        name: '',
        level: 0,
        is_active: true,
      });
      setIsCreating(false);
    } catch (error) {
      if (error instanceof ApiError) {
        const messages = Object.entries(error.errors)
          .map(([k, v]) => `${k}: ${v.join(', ')}`)
          .join('\n');
        alert(messages || 'Failed to create node type');
      } else {
        alert('Failed to create node type');
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading node types...</div>;
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
            Create Node Type
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              placeholder="Code (e.g., PRG)"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="text-sm uppercase"
            />
            <Input
              placeholder="Name (e.g., Program)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="text-sm"
            />
            <Input
              type="number"
              placeholder="Level (0 = top)"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value === '' ? 0 : parseInt(e.target.value, 10) })}
              className="text-sm"
            />
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
            <Plus className="w-3 h-3 mr-1" /> New Type
          </Button>
        )}
      </motion.div>

      {/* Node Types List */}
      <div className="space-y-2">
        {nodeTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No node types yet. Create one to get started.
          </div>
        ) : (
          nodeTypes.map((type: any) => (
            <NodeTypeRow key={type.id} nodeType={type} />
          ))
        )}
      </div>
    </div>
  );
}

function NodeTypeRow({ nodeType }: { nodeType: any }) {
  const updateMutation = useUpdateBudgetNodeType(nodeType.id);
  const deleteMutation = useDeleteBudgetNodeType(nodeType.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(nodeType);

  const handleUpdate = async () => {
    try {
      await updateMutation.mutateAsync({
        code: editData.code,
        name: editData.name,
        level: editData.level,
        is_active: editData.is_active,
      });
      setIsEditing(false);
    } catch (error) {
      alert('Failed to update node type');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this node type?')) {
      try {
        await deleteMutation.mutateAsync();
      } catch (error) {
        alert('Failed to delete node type');
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
            value={editData.code}
            onChange={(e) => setEditData({ ...editData, code: e.target.value })}
            className="text-xs uppercase"
            placeholder="Code"
          />
          <Input
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="text-xs"
            placeholder="Name"
          />
          <Input
            type="number"
            value={editData.level}
            onChange={(e) => setEditData({ ...editData, level: e.target.value === '' ? 0 : parseInt(e.target.value, 10) })}
            className="text-xs"
            placeholder="Level"
          />
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={editData.is_active}
              onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
              className="rounded border-border"
            />
            Active
          </label>
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
      className="widget-card p-4 flex items-center justify-between group hover:bg-secondary/30 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-sm font-mono font-bold text-primary">{nodeType.code}</span>
          <h4 className="font-semibold text-foreground truncate">{nodeType.name}</h4>
          <span className="text-xs px-2 py-1 rounded-full bg-secondary/50 text-muted-foreground font-medium">
            Lvl {nodeType.level}
          </span>
          {!nodeType.is_active && (
            <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
              Inactive
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          title="Edit node type"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete node type"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
