import { useState } from "react";
import { V2Shell } from "@/components/v2/V2Shell";
import {
  useModuleActivations,
  useResolveModuleActivation,
  useCreateModuleActivation,
  useUpdateModuleActivation,
  useDeleteModuleActivation,
} from "@/lib/hooks/useV2Module";
import { useOrganizations, useScopeNodes } from "@/lib/hooks/useScopeNodes";
import { ApiError } from "@/lib/api/client";
import type {
  ModuleActivation,
  ModuleCode,
  CreateModuleActivationRequest,
} from "@/lib/types/v2module";
import { MODULE_OPTIONS } from "@/lib/types/v2module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  Shield,
  Plus,
  Trash2,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function PageLoading() {
  return (
    <div className="flex h-32 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
      <CheckCircle2 className="h-3 w-3" /> Active
    </Badge>
  ) : (
    <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 gap-1">
      <XCircle className="h-3 w-3" /> Inactive
    </Badge>
  );
}

function OverrideBadge({ value }: { value: boolean }) {
  if (!value) return null;
  return (
    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 dark:text-orange-300">
      override
    </Badge>
  );
}

// ── Resolve Panel ─────────────────────────────────────────────────────────────

function ResolvePanel({
  module,
  scopeNodeId,
}: {
  module: string | null;
  scopeNodeId: string | null;
}) {
  const { data, isLoading, isFetching } = useResolveModuleActivation({
    module: module ?? "",
    scope_node: scopeNodeId ?? "",
  });

  if (!module || !scopeNodeId) {
    return (
      <div className="rounded-lg border border-border bg-secondary/10 p-4 text-sm text-muted-foreground">
        Select a module and scope node to see effective activation status.
      </div>
    );
  }

  if (isLoading || isFetching) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/10 p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Resolving effective status...</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <p className="text-sm font-medium">Effective Activation</p>
      <div className="flex items-center gap-3">
        <ActiveBadge isActive={data.is_active} />
        <span className="text-xs text-muted-foreground">
          for <strong>{module}</strong> at node#{scopeNodeId}
          {data.is_active
            ? " — invoice workflows can be started at this node"
            : " — workflows will not start; activate the module first"}
        </span>
      </div>
    </div>
  );
}

// ── Create / Edit Dialog ─────────────────────────────────────────────────────

function ActivationDialog({
  existing,
  scopeNodeId,
  module,
  nodes,
  onSuccess,
}: {
  existing?: ModuleActivation;
  scopeNodeId: string | null;
  module: string | null;
  nodes: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isActive, setIsActive] = useState(existing?.is_active ?? false);
  const [overrideParent, setOverrideParent] = useState(
    existing?.override_parent ?? false,
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    existing?.scope_node ?? scopeNodeId ?? null,
  );
  const [selectedModule, setSelectedModule] = useState<ModuleCode | null>(
    (existing?.module as ModuleCode) ?? (module as ModuleCode) ?? null,
  );

  const createActivation = useCreateModuleActivation();
  const updateActivation = useUpdateModuleActivation();

  const isEdit = !!existing;
  const isPending = createActivation.isPending || updateActivation.isPending;

  const errorMessage = createActivation.isError
    ? createActivation.error instanceof ApiError
      ? createActivation.error.message
      : "Failed to create"
    : updateActivation.isError
    ? updateActivation.error instanceof ApiError
      ? updateActivation.error.message
      : "Failed to update"
    : null;

  const handleSubmit = async () => {
    if (!selectedNodeId || !selectedModule) return;
    try {
      if (isEdit) {
        await updateActivation.mutateAsync({
          id: existing.id,
          data: { is_active: isActive, override_parent: overrideParent },
        });
      } else {
        await createActivation.mutateAsync({
          module: selectedModule,
          scope_node: selectedNodeId,
          is_active: isActive,
          override_parent: overrideParent,
        });
      }
      setOpen(false);
      onSuccess?.();
    } catch {
      // error via mutation
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setIsActive(existing?.is_active ?? false);
          setOverrideParent(existing?.override_parent ?? false);
          setSelectedNodeId(existing?.scope_node ?? scopeNodeId ?? null);
          setSelectedModule(
            (existing?.module as ModuleCode) ??
              (module as ModuleCode) ??
              null,
          );
        }
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="sm" variant="ghost">
            Edit
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Activation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Activation" : "Create Activation"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!isEdit && (
            <>
              <div className="space-y-1.5">
                <Label>Module *</Label>
                <Select
                  value={selectedModule ?? ""}
                  onValueChange={(v) => setSelectedModule(v as ModuleCode)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Scope Node *</Label>
                <Select
                  value={selectedNodeId ?? ""}
                  onValueChange={setSelectedNodeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scope node..." />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
            <Checkbox
              id="is-active"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(!!v)}
            />
            <Label htmlFor="is-active" className="text-sm font-normal cursor-pointer">
              Module is active
            </Label>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
            <Checkbox
              id="override-parent"
              checked={overrideParent}
              onCheckedChange={(v) => setOverrideParent(!!v)}
            />
            <Label htmlFor="override-parent" className="text-sm font-normal cursor-pointer">
              Override parent setting
              <span className="ml-1.5 text-xs text-muted-foreground">
                (when on, this node is authoritative for this module)
              </span>
            </Label>
          </div>

          {errorMessage && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isPending ||
              (!isEdit && (!selectedNodeId || !selectedModule))
            }
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                {isEdit ? "Updating..." : "Creating..."}
              </>
            ) : isEdit ? (
              "Update"
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Activation List ───────────────────────────────────────────────────────────

function ActivationList({
  activations,
  isLoading,
  scopeNodeId,
  module,
  nodes,
  onRefresh,
}: {
  activations: ModuleActivation[];
  isLoading: boolean;
  scopeNodeId: string | null;
  module: string | null;
  nodes: Array<{ id: string; name: string }>;
  onRefresh?: () => void;
}) {
  const deleteActivation = useDeleteModuleActivation();

  if (isLoading) return <PageLoading />;

  if (activations.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No activations found for the selected filters.
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {activations.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <ActiveBadge isActive={a.is_active} />
            <div>
              <p className="text-sm font-medium">
                {MODULE_OPTIONS.find((m) => m.value === a.module)?.label ??
                  a.module}
              </p>
              <p className="text-xs text-muted-foreground">
                Node#{a.scope_node}
              </p>
            </div>
            <OverrideBadge value={a.override_parent} />
          </div>
          <div className="flex items-center gap-2">
            <ActivationDialog
              existing={a}
              scopeNodeId={scopeNodeId}
              module={module}
              nodes={nodes}
              onSuccess={onRefresh}
            />
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (
                  window.confirm(
                    "Delete this activation? Child nodes will inherit from ancestors.",
                  )
                ) {
                  deleteActivation.mutate(a.id);
                }
              }}
              disabled={deleteActivation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

const ModuleActivationPage = () => {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>("all");

  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { data: nodes = [], isLoading: nodesLoading } = useScopeNodes(
    selectedOrgId ?? undefined,
  );

  const {
    data: activations = [],
    isLoading: activationsLoading,
    refetch,
  } = useModuleActivations({
    scope_node: selectedNodeId && selectedNodeId !== "__all__" ? selectedNodeId : undefined,
    module: selectedModule !== "all" ? selectedModule : undefined,
  });

  return (
    <V2Shell
      title="Module Activation"
      titleIcon={<ToggleLeft className="h-5 w-5 text-muted-foreground" />}
      actions={
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Org</Label>
          {orgsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Select
              value={selectedOrgId ?? ""}
              onValueChange={(v) => {
                setSelectedOrgId(v);
                setSelectedNodeId(null);
              }}
            >
              <SelectTrigger className="w-48">
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

          <Label className="text-xs text-muted-foreground ml-2">Node</Label>
          {nodesLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Select
              value={selectedNodeId ?? ""}
              onValueChange={(v) => setSelectedNodeId(v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select node..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All nodes</SelectItem>
                {nodes.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Label className="text-xs text-muted-foreground ml-2">Module</Label>
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {MODULE_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — resolve panel + create */}
        <aside className="flex w-80 flex-col border-r border-border overflow-y-auto">
          {/* Effective status */}
          <div className="border-b border-border p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Effective Status
            </p>
            <ResolvePanel
              module={
                selectedModule !== "all" ? selectedModule : "invoice"
              }
              scopeNodeId={
                selectedNodeId && selectedNodeId !== "__all__"
                  ? selectedNodeId
                  : null
              }
            />
          </div>

          {/* Create */}
          <div className="border-b border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Add Activation
            </p>
            <ActivationDialog
              scopeNodeId={
                selectedNodeId && selectedNodeId !== "__all__"
                  ? selectedNodeId
                  : null
              }
              module={selectedModule !== "all" ? selectedModule : null}
              nodes={nodes}
              onSuccess={() => refetch()}
            />
          </div>

          {/* Info */}
          <div className="p-4 text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground">How it works</p>
            <p>
              <strong>Active</strong> means the module is enabled at this node.
            </p>
            <p>
              <strong>Override parent</strong> means this node is the authoritative
              source — parent settings do not apply.
            </p>
            <p>
              Without override, the system walks up the hierarchy to find the
              nearest explicit activation.
            </p>
          </div>
        </aside>

        {/* Right — activation list */}
        <main className="flex-1 overflow-y-auto bg-secondary/5">
          <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Activations</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                className="gap-1.5"
              >
                Refresh
              </Button>
            </div>
          </div>
          <ActivationList
            activations={activations}
            isLoading={activationsLoading}
            scopeNodeId={
              selectedNodeId && selectedNodeId !== "__all__"
                ? selectedNodeId
                : null
            }
            module={selectedModule !== "all" ? selectedModule : null}
            nodes={nodes}
            onRefresh={() => refetch()}
          />
        </main>
      </div>
    </V2Shell>
  );
};

export default ModuleActivationPage;
