import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { V2Shell } from "@/components/v2/V2Shell";
import {
  useOrganizations,
  useScopeNodes,
  useScopeNode,
  useScopeNodeAncestors,
  useCreateScopeNode,
} from "@/lib/hooks/useScopeNodes";
import type { ScopeNode, ScopeNodeTree, NodeType } from "@/lib/types/core";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRight,
  Building2,
  Plus,
  Loader2,
  Hash,
  Network,
  ArrowUpRight,
  Users2,
  MapPin,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const UNIT_TYPE_OPTIONS: { value: NodeType; label: string }[] = [
  { value: "company", label: "Company" },
  { value: "entity", label: "Entity" },
  { value: "region", label: "Region" },
  { value: "branch", label: "Branch" },
  { value: "department", label: "Department" },
  { value: "cost_center", label: "Cost Center" },
];

const UNIT_TYPE_COLORS: Record<NodeType, string> = {
  company: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  entity: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  region: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  branch: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  department: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  cost_center: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function unitTypeLabel(nodeType: NodeType): string {
  return UNIT_TYPE_OPTIONS.find((o) => o.value === nodeType)?.label ?? nodeType;
}

function buildTree(nodes: ScopeNode[]): ScopeNodeTree[] {
  const map = new Map<string, ScopeNodeTree>();
  const roots: ScopeNodeTree[] = [];

  for (const n of nodes) {
    map.set(n.id, { ...n, children: [] });
  }
  for (const node of map.values()) {
    if (node.parent && map.has(node.parent)) {
      map.get(node.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// ── Unit Type Badge ───────────────────────────────────────────────────────────

function UnitTypeBadge({ nodeType }: { nodeType: NodeType }) {
  return (
    <Badge className={UNIT_TYPE_COLORS[nodeType] ?? ""} variant="outline">
      {unitTypeLabel(nodeType)}
    </Badge>
  );
}

// ── Hierarchical Tree Row ─────────────────────────────────────────────────────

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
  childCount,
}: {
  node: ScopeNodeTree;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  childCount: number;
}) {
  const isSelected = node.id === selectedId;
  return (
    <>
      <button
        className={`flex w-full items-center gap-2 py-2 pr-3 text-left text-sm transition-colors hover:bg-accent ${
          isSelected ? "bg-accent" : ""
        }`}
        style={{ paddingLeft: `${12 + depth * 18}px` }}
        onClick={() => onSelect(node.id)}
      >
        {depth > 0 && (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        {depth === 0 && (
          <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 truncate font-medium">{node.name}</span>
        {childCount > 0 && (
          <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
            {childCount}
          </span>
        )}
        <UnitTypeBadge nodeType={node.node_type} />
      </button>
      {node.children.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          childCount={(child as ScopeNodeTree).children?.length ?? 0}
        />
      ))}
    </>
  );
}

// ── Add Unit Dialog ───────────────────────────────────────────────────────────

interface AddUnitFormValues {
  name: string;
  code: string;
  node_type: NodeType;
  parent: string;
}

function AddUnitDialog({
  orgId,
  nodes,
  defaultParentId,
  open,
  onOpenChange,
  onSuccess,
}: {
  orgId: string;
  nodes: ScopeNode[];
  defaultParentId?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}) {
  const createUnit = useCreateScopeNode();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddUnitFormValues>({
    defaultValues: {
      name: "",
      code: "",
      node_type: "entity",
      parent: defaultParentId ?? "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        name: "",
        code: "",
        node_type: "entity",
        parent: defaultParentId ?? "",
      });
      createUnit.reset();
    }
  }, [open]);

  const onSubmit = async (data: AddUnitFormValues) => {
    try {
      await createUnit.mutateAsync({
        org: orgId,
        parent: data.parent === "__root__" ? undefined : data.parent || undefined,
        name: data.name.trim(),
        code: data.code.trim(),
        node_type: data.node_type,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // error shown via createUnit.error
    }
  };

  const submitError =
    createUnit.isError && createUnit.error instanceof ApiError
      ? createUnit.error.message
      : createUnit.isError
      ? "Failed to create unit. Please check the fields and try again."
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} aria-describedby={undefined}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Unit</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add a company, entity, region, branch, or other unit to your organization structure.
          </p>
        </DialogHeader>

        <form id="add-unit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Unit Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Unit Name *</Label>
            <Input
              id="name"
              {...register("name", { required: "Unit name is required" })}
              placeholder="e.g. India Operations"
              className={errors.name ? "border-destructive" : ""}
              autoFocus
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Internal Code */}
            <div className="space-y-1.5">
              <Label htmlFor="code">Internal Code *</Label>
              <Input
                id="code"
                {...register("code", { required: "Code is required" })}
                placeholder="e.g. IN-OPS"
                className={errors.code ? "border-destructive" : ""}
              />
              {errors.code ? (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Short unique identifier</p>
              )}
            </div>

            {/* Unit Type */}
            <div className="space-y-1.5">
              <Label htmlFor="unit_type">Unit Type *</Label>
              <Select
                defaultValue="entity"
                onValueChange={(v) => setValue("node_type", v as NodeType)}
              >
                <SelectTrigger id="unit_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Parent Unit */}
          <div className="space-y-1.5">
            <Label htmlFor="parent">Parent Unit</Label>
            <Select
              defaultValue={defaultParentId ?? ""}
              onValueChange={(v) => setValue("parent", v)}
            >
              <SelectTrigger id="parent">
                <SelectValue placeholder="Top-level unit (no parent)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">Top-level unit (no parent)</SelectItem>
                {nodes.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name}
                    <span className="ml-1.5 text-muted-foreground">· {unitTypeLabel(n.node_type)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Leave blank to create a top-level unit in this organization.
            </p>
          </div>

          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-unit-form"
            disabled={createUnit.isPending}
          >
            {createUnit.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Adding…
              </>
            ) : (
              "Add Unit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Unit Detail Panel ─────────────────────────────────────────────────────────

function UnitDetailPanel({
  unit,
  allNodes,
  onAddChild,
}: {
  unit: ScopeNode | null;
  allNodes: ScopeNode[];
  onAddChild: (parentId: string) => void;
}) {
  const { data: ancestors = [], isLoading: ancestorsLoading } = useScopeNodeAncestors(
    unit?.id ?? null,
  );

  if (!unit) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Select a unit</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose a unit from the list to view its details and hierarchy.
          </p>
        </div>
      </div>
    );
  }

  const parentUnit = unit.parent
    ? allNodes.find((n) => n.id === unit.parent)
    : null;

  const directChildren = allNodes.filter((n) => n.parent === unit.id);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">{unit.name}</h2>
            <p className="text-xs text-muted-foreground font-mono">{unit.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <UnitTypeBadge nodeType={unit.node_type} />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-5">
          {/* Key details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Hash className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Internal Code</p>
              </div>
              <p className="text-sm font-semibold font-mono">{unit.code}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Network className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Unit Type</p>
              </div>
              <p className="text-sm font-semibold">{unitTypeLabel(unit.node_type)}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Parent Unit</p>
              </div>
              <p className="text-sm font-semibold">
                {parentUnit ? parentUnit.name : "Top-level unit"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Users2 className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Child Units</p>
              </div>
              <p className="text-sm font-semibold">{directChildren.length}</p>
            </div>
          </div>

          <Separator />

          {/* Hierarchy path (ancestors) */}
          <div>
            <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              Hierarchy Path
            </h3>
            {ancestorsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : ancestors.length === 0 ? (
              <p className="rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                Top-level unit — no parent units above this one.
              </p>
            ) : (
              <div className="space-y-1">
                {ancestors.map((anc, i) => (
                  <div
                    key={anc.id}
                    className="flex items-center gap-2 rounded-md border border-border bg-secondary/20 px-3 py-2"
                    style={{ paddingLeft: `${12 + i * 12}px` }}
                  >
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm">{anc.name}</span>
                    <UnitTypeBadge nodeType={anc.node_type} />
                  </div>
                ))}
                {/* Current unit at the end */}
                <div
                  className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2"
                  style={{ paddingLeft: `${12 + ancestors.length * 12}px` }}
                >
                  <ChevronRight className="h-3 w-3 shrink-0 text-primary" />
                  <span className="flex-1 text-sm font-medium text-foreground">{unit.name}</span>
                  <UnitTypeBadge nodeType={unit.node_type} />
                </div>
              </div>
            )}
          </div>

          {/* Direct children */}
          {directChildren.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Users2 className="h-3.5 w-3.5" />
                  Child Units ({directChildren.length})
                </h3>
                <div className="space-y-1">
                  {directChildren.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-secondary/20 px-3 py-2"
                    >
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-sm">{child.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{child.code}</span>
                      <UnitTypeBadge nodeType={child.node_type} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Add child unit shortcut */}
          <div className="pt-1">
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1.5 text-xs"
              onClick={() => onAddChild(unit.id)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Child Unit under {unit.name}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const ScopeNodesPage = () => {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogParentId, setAddDialogParentId] = useState<string | null>(null);

  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { data: nodes = [], isLoading: nodesLoading } = useScopeNodes(
    selectedOrgId ?? undefined,
  );

  // Auto-select first org if only one
  useEffect(() => {
    if (!selectedOrgId && organizations.length === 1 && organizations[0]) {
      setSelectedOrgId(organizations[0].id);
    }
  }, [selectedOrgId, organizations]);

  const tree = useMemo(() => buildTree(nodes), [nodes]);

  const selectedUnit = nodes.find((n) => n.id === selectedUnitId) ?? null;

  const openAddDialog = (parentId: string | null = null) => {
    setAddDialogParentId(parentId);
    setAddDialogOpen(true);
  };

  return (
    <V2Shell
      title="Organization Structure"
      titleIcon={<Building2 className="h-5 w-5 text-muted-foreground" />}
      actions={
        <Button
          size="sm"
          className="gap-1.5"
          disabled={!selectedOrgId}
          onClick={() => openAddDialog(null)}
        >
          <Plus className="h-4 w-4" />
          Add Unit
        </Button>
      }
    >
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left panel: org selector + hierarchy list */}
        <aside className="flex w-full md:w-72 flex-col border-b border-border md:border-b-0 md:border-r bg-background max-h-[45vh] md:max-h-none">
          {/* Org selector */}
          <div className="border-b border-border p-3">
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Organization
            </Label>
            {orgsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <Select
                value={selectedOrgId ?? ""}
                onValueChange={(v) => {
                  setSelectedOrgId(v);
                  setSelectedUnitId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Description */}
          {selectedOrgId && !nodesLoading && (
            <div className="border-b border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {nodes.length === 0
                  ? "No units yet — add your first one."
                  : `${nodes.length} unit${nodes.length !== 1 ? "s" : ""} in structure`}
              </p>
            </div>
          )}

          {/* Hierarchy tree */}
          <div className="flex-1 overflow-y-auto">
            {!selectedOrgId ? (
              <div className="p-4 text-sm text-muted-foreground">
                Select an organization to view its structure.
              </div>
            ) : nodesLoading ? (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading structure…
              </div>
            ) : nodes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No units yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Start building your organization structure by adding the first unit.
                  </p>
                </div>
                <Button size="sm" className="gap-1.5 mt-1" onClick={() => openAddDialog(null)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add First Unit
                </Button>
              </div>
            ) : (
              <div className="py-1">
                {tree.map((rootNode) => (
                  <TreeRow
                    key={rootNode.id}
                    node={rootNode}
                    depth={0}
                    selectedId={selectedUnitId}
                    onSelect={setSelectedUnitId}
                    childCount={rootNode.children.length}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Right panel: unit detail */}
        <main className="flex-1 overflow-hidden bg-secondary/5">
          <UnitDetailPanel
            unit={selectedUnit}
            allNodes={nodes}
            onAddChild={(parentId) => openAddDialog(parentId)}
          />
        </main>
      </div>

      {/* Add Unit Dialog */}
      {selectedOrgId && (
        <AddUnitDialog
          orgId={selectedOrgId}
          nodes={nodes}
          defaultParentId={addDialogParentId}
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={() => {
            setAddDialogOpen(false);
          }}
        />
      )}
    </V2Shell>
  );
};

export default ScopeNodesPage;

