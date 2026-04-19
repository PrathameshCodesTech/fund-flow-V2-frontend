import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBudgetPeriods, useBudgetVersions, useBudgetNodes, useBudgetNodeTypes } from '@/lib/hooks/useBudgets';
import { 
  useCreateBudgetNode, 
  useUpdateBudgetNode, 
  useDeleteBudgetNode 
} from '@/lib/hooks/useBudgetMutations';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Edit2, Check, X, ChevronRight } from 'lucide-react';
import type { BudgetNode } from '@/lib/types/budgets';
import { ApiError } from '@/lib/api/client';

export default function BudgetNodeTab() {
  const { user } = useAuth();
  const { data: periods } = useBudgetPeriods(
    user?.organization_id ? { organization: user.organization_id } : undefined
  );
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const { data: versions } = useBudgetVersions(
    selectedPeriodId ? { period: selectedPeriodId } : undefined
  );
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const { data: nodes = [], isLoading } = useBudgetNodes(
    selectedVersionId ? { version: selectedVersionId } : undefined
  );
  const { data: nodeTypes = [] } = useBudgetNodeTypes();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const createMutation = useCreateBudgetNode();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    node_type_id: '',
    approved_amount: '0',
    currency: 'INR',
    sort_order: 0,
    is_active: true,
  });

  const handleCreate = async () => {
    const errors: string[] = [];
    if (!selectedVersionId) errors.push('Select a version first');
    if (!formData.code.trim()) errors.push('Code is required');
    if (!formData.name.trim()) errors.push('Name is required');
    if (!formData.node_type_id) errors.push('Node type is required');
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    try {
      await createMutation.mutateAsync({
        budget_version_id: selectedVersionId,
        node_type_id: formData.node_type_id,
        parent_id: selectedParentId || undefined,
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        approved_amount: parseFloat(formData.approved_amount) || 0,
        currency: formData.currency,
        sort_order: formData.sort_order || 0,
        is_active: formData.is_active,
      });
      setFormData({
        code: '',
        name: '',
        description: '',
        node_type_id: '',
        approved_amount: '0',
        currency: 'INR',
        sort_order: 0,
        is_active: true,
      });
      setSelectedParentId(null);
      setIsCreating(false);
    } catch (error) {
      if (error instanceof ApiError) {
        const messages = Object.entries(error.errors)
          .map(([k, v]) => `${k}: ${v.join(', ')}`)
          .join('\n');
        alert(messages || 'Failed to create node');
      } else {
        alert('Failed to create node');
      }
    }
  };

  const buildTree = (nodes: BudgetNode[], parentId: string | null = null): BudgetNode[] => {
    return nodes
      .filter((n) => (parentId ? n.parent_id === parentId : !n.parent_id))
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  const rootNodes = buildTree(nodes);

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="widget-card">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Select Period
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => {
              setSelectedPeriodId(e.target.value);
              setSelectedVersionId('');
            }}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">-- Choose a period --</option>
            {periods?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (FY{p.fiscal_year})
              </option>
            ))}
          </select>
        </div>

        <div className="widget-card">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Select Version
          </label>
          <select
            value={selectedVersionId}
            onChange={(e) => setSelectedVersionId(e.target.value)}
            disabled={!selectedPeriodId}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
          >
            <option value="">-- Choose a version --</option>
            {versions?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.is_active ? '(active)' : ''} v{v.version_number}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Create Form */}
      {selectedVersionId && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="widget-card border-l-4 border-primary/30"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Budget Node
              {selectedParentId && (
                <span className="text-xs text-muted-foreground font-normal">
                  (as child of selected parent)
                </span>
              )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Input
                  placeholder="Code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="text-sm"
                />
                <Input
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-sm"
                />
                <select
                  value={formData.node_type_id}
                  onChange={(e) => setFormData({ ...formData, node_type_id: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select Node Type</option>
                  {nodeTypes.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
              <Input
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-sm"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  type="number"
                  placeholder="Approved Amount"
                  value={formData.approved_amount}
                  onChange={(e) => setFormData({ ...formData, approved_amount: e.target.value })}
                  className="text-sm"
                />
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <Input
                  type="number"
                  placeholder="Sort order"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value === '' ? 0 : parseInt(e.target.value, 10) })}
                  className="text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-border"
                  />
                  Active
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
              <Plus className="w-3 h-3 mr-1" /> New Node
            </Button>
          )}
        </motion.div>
      )}

      {/* Nodes Tree */}
      <div className="space-y-2">
        {!selectedVersionId ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Select a version to view and manage budget nodes.
          </div>
        ) : isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Loading nodes...
          </div>
        ) : rootNodes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No budget nodes yet. Create one to get started.
          </div>
        ) : (
          rootNodes.map((node) => (
            <NodeRowWithChildren
              key={node.id}
              node={node}
              allNodes={nodes}
              selectedParentId={selectedParentId}
              onSelectParent={setSelectedParentId}
              buildTree={buildTree}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NodeRowWithChildren({
  node,
  allNodes,
  selectedParentId,
  onSelectParent,
  buildTree,
}: {
  node: BudgetNode;
  allNodes: BudgetNode[];
  selectedParentId: string | null;
  onSelectParent: (id: string | null) => void;
  buildTree: (nodes: BudgetNode[], parentId: string | null) => BudgetNode[];
}) {
  const [expanded, setExpanded] = useState(false);
  const children = buildTree(allNodes, node.id);
  const hasChildren = children.length > 0;
  const isSelected = node.id === selectedParentId;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`widget-card p-3 transition-all ${isSelected ? 'border-l-4 border-primary ring-1 ring-primary/30' : 'hover:bg-secondary/30'}`}
        onClick={() => onSelectParent(isSelected ? null : node.id)}
      >
        <div className="flex items-start gap-2">
          {hasChildren && (
            <motion.button
              animate={{ rotate: expanded ? 90 : 0 }}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="p-1 hover:bg-secondary rounded flex-shrink-0"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          )}
          {!hasChildren && <div className="w-6 flex-shrink-0" />}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-primary">{node.code}</span>
              <h4 className="font-semibold text-foreground truncate">{node.name}</h4>
              <span className="text-xs px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground font-medium whitespace-nowrap">
                {node.node_type.name}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
              {node.description && <span>{node.description}</span>}
              <span className="font-mono">{node.currency} {node.approved_amount}</span>
              {!node.is_active && <span className="text-destructive">Inactive</span>}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 hover:opacity-100 transition-opacity flex-shrink-0 group-hover:opacity-100">
            <NodeRowActions node={node} />
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-6 space-y-2 border-l border-border/50 pl-2"
          >
            {children.map((child) => (
              <NodeRowWithChildren
                key={child.id}
                node={child}
                allNodes={allNodes}
                selectedParentId={selectedParentId}
                onSelectParent={onSelectParent}
                buildTree={buildTree}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NodeRowActions({ node }: { node: BudgetNode }) {
  const updateMutation = useUpdateBudgetNode(node.id);
  const deleteMutation = useDeleteBudgetNode(node.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(node);
  const { data: nodeTypes = [] } = useBudgetNodeTypes();

  const handleUpdate = async () => {
    try {
      await updateMutation.mutateAsync({
        code: editData.code,
        name: editData.name,
        description: editData.description,
        node_type_id: editData.node_type.id,
        approved_amount: editData.approved_amount,
        currency: editData.currency,
        sort_order: editData.sort_order,
        is_active: editData.is_active,
      });
      setIsEditing(false);
    } catch (error) {
      alert('Failed to update node');
    }
  };

  const handleDelete = () => {
    if (confirm('Delete this budget node? This may affect children.')) {
      deleteMutation.mutate();
    }
  };

  if (isEditing) {
    return (
      <div className="flex-1 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Input
            value={editData.code}
            onChange={(e) => setEditData({ ...editData, code: e.target.value })}
            className="text-xs"
            placeholder="Code"
          />
          <Input
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="text-xs"
            placeholder="Name"
          />
          <select
            value={editData.node_type.id}
            onChange={(e) => {
              const nt = nodeTypes.find((t: any) => t.id === e.target.value);
              if (nt) {
                setEditData({
                  ...editData,
                  node_type: nt,
                });
              }
            }}
            className="px-2 py-1 rounded-lg border border-border bg-card text-xs text-foreground"
          >
            {nodeTypes.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
          <Input
            value={editData.description ?? ''}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="text-xs"
            placeholder="Description"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            type="number"
            value={editData.approved_amount}
            onChange={(e) => setEditData({ ...editData, approved_amount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
            className="text-xs"
            placeholder="Amount"
          />
          <select
            value={editData.currency}
            onChange={(e) => setEditData({ ...editData, currency: e.target.value })}
            className="px-2 py-1 rounded-lg border border-border bg-card text-xs text-foreground"
          >
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <Input
            type="number"
            value={editData.sort_order}
            onChange={(e) => setEditData({ ...editData, sort_order: e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0 })}
            className="text-xs"
            placeholder="Sort"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 cursor-pointer text-xs">
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
    );
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={() => setIsEditing(true)}
        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
      >
        <Edit2 className="w-3 h-3" />
      </button>
      <button
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
