import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { V2Shell } from "@/components/v2/V2Shell";
import {
  useTemplates,
  useCreateTemplate,
  useVersions,
  useCreateVersion,
  usePublishVersion,
  useArchiveVersion,
  useStepGroups,
  useCreateStepGroup,
  useWorkflowSteps,
  useCreateWorkflowStep,
  useUpdateStepGroup,
  useDeleteStepGroup,
  useUpdateWorkflowStep,
  useDeleteWorkflowStep,
  useUpdateTemplate,
  useDeleteTemplate,
  useDeleteVersion,
} from "@/lib/hooks/useV2WorkflowConfig";
import { useOrganizations, useScopeNodes } from "@/lib/hooks/useScopeNodes";
import { useRoles } from "@/lib/hooks/useAccess";
import { UserPicker } from "@/components/v2/UserPicker";
import { MultiSelectUnits } from "@/components/v2/MultiSelectUnits";
import type {
  CreateTemplateRequest,
  CreateVersionRequest,
  CreateStepGroupRequest,
  CreateWorkflowStepRequest,
  ParallelMode,
  RejectionAction,
  ScopeResolutionPolicy,
  StepKind,
  SplitTargetMode,
  JoinPolicy,
  WorkflowTemplate,
  WorkflowTemplateVersion,
  StepGroup,
  WorkflowStep,
} from "@/lib/types/v2workflow";
import {
  PARALLEL_MODE_LABELS,
  REJECTION_ACTION_LABELS,
  SCOPE_RESOLUTION_LABELS,
  VERSION_STATUS_LABELS,
  STEP_KIND_LABELS,
  SPLIT_TARGET_MODE_LABELS,
  JOIN_POLICY_LABELS,
} from "@/lib/types/v2workflow";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  GitBranch,
  Plus,
  Loader2,
  CheckCircle2,
  Archive,
  Globe,
  ChevronRight,
  Eye,
  Layers,
  ArrowDown,
  CircleDot,
  Users,
  Building2,
  Info,
  X,
} from "lucide-react";

// ── Module options ──────────────────────────────────────────────────────────────

const MODULE_OPTIONS = [
  { value: "invoice", label: "Invoice" },
  { value: "campaign", label: "Campaign" },
  { value: "vendor", label: "Vendor" },
  { value: "budget", label: "Budget" },
];

// ── Scope resolution friendly descriptions ─────────────────────────────────────

const SCOPE_RESOLUTION_HELP: Record<ScopeResolutionPolicy, string> = {
  SUBJECT_NODE: "Approver is resolved within the record's own unit",
  ANCESTOR_OF_TYPE: "Approver is the nearest matching unit up the hierarchy",
  ORG_ROOT: "Approver is resolved at the organization root",
  FIXED_NODE: "Approver is always resolved from a fixed unit",
};

// ── Status colors ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_COLORS[status] ?? ""} variant="outline">
      {(VERSION_STATUS_LABELS as Record<string, string>)[status] ?? status}
    </Badge>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function PageLoading() {
  return (
    <div className="flex h-32 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function FormField({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Module badge color ─────────────────────────────────────────────────────────

const MODULE_COLORS: Record<string, string> = {
  invoice: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  campaign: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  vendor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  budget: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

// ── Create Workflow Dialog ─────────────────────────────────────────────────────

function CreateWorkflowDialog({
  nodeId,
  orgId,
  open,
  onOpenChange,
  onSuccess,
}: {
  nodeId: string | null;
  orgId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: (id: string) => void;
}) {
  const { data: nodes = [] } = useScopeNodes(orgId ?? undefined);
  const [selectedModule, setSelectedModule] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateTemplateRequest>({
    defaultValues: {
      name: "",
      module: "",
      scope_node: nodeId ?? "",
    },
  });

  const createTemplate = useCreateTemplate();
  const selectedNodeLabel = nodes.find((node) => node.id === nodeId)?.name ?? "No unit selected";

  useEffect(() => {
    if (!open) {
      return;
    }
    setValue("scope_node", nodeId ?? "");
  }, [nodeId, open, setValue]);

  function handleClose(v: boolean) {
    onOpenChange(v);
    if (!v) {
      reset();
      setSelectedModule("");
    }
  }

  const onSubmit = async (data: CreateTemplateRequest) => {
    try {
      const result = await createTemplate.mutateAsync({
        name: data.name,
        module: data.module,
        scope_node: data.scope_node,
      });
      handleClose(false);
      onSuccess?.(result.id ?? result as unknown as string);
    } catch {
      // error surfaced via mutation
    }
  };

  const submitError =
    createTemplate.isError && createTemplate.error instanceof ApiError
      ? createTemplate.error.message.includes("module, scope_node")
        ? `A ${selectedModule || "workflow"} already exists for ${selectedNodeLabel}. This model allows one workflow template per module per unit. Create a new version of the existing workflow instead.`
        : createTemplate.error.message
      : createTemplate.isError
      ? "Failed to create workflow"
      : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Workflow</DialogTitle>
          <DialogDescription>
            Create an approval workflow for a specific module and unit. You can add stages and approvers after creating it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Workflow Name" error={errors.name?.message}>
            <Input
              {...register("name", { required: "Required" })}
              placeholder="e.g. Invoice Approval Flow"
            />
          </FormField>

          <FormField label="Module" error={errors.module?.message}>
            <Select
              value={selectedModule}
              onValueChange={(v) => { setSelectedModule(v); setValue("module", v); }}
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
          </FormField>

          <FormField label="Unit" error={errors.scope_node?.message} hint="This workflow will be created for the unit selected in the page header.">
            <Input value={selectedNodeLabel} readOnly disabled />
          </FormField>

          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTemplate.isPending}>
              {createTemplate.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Workflow"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Version Dialog ─────────────────────────────────────────────────────

function CreateVersionDialog({
  templateId,
  maxVersion,
  open,
  onOpenChange,
  onSuccess,
}: {
  templateId: string | null;
  maxVersion: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<{ version_number: number }>({
    defaultValues: { version_number: maxVersion + 1 },
  });

  const createVersion = useCreateVersion();

  const onSubmit = async (data: { version_number: number }) => {
    if (!templateId) return;
    try {
      await createVersion.mutateAsync({
        template: templateId,
        version_number: data.version_number,
      });
      onOpenChange(false);
      reset();
      onSuccess?.();
    } catch {
      // error surfaced via mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Version</DialogTitle>
          <DialogDescription>
            Create a draft version to define a new approval flow. Publish it once the stages are configured.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Version Number" error={errors.version_number?.message}>
            <Input
              type="number"
              min={1}
              {...register("version_number", {
                required: "Required",
                valueAsNumber: true,
                min: { value: 1, message: "Must be at least 1" },
              })}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={createVersion.isPending}>
              {createVersion.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Create Version
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Approval Group Dialog ───────────────────────────────────────────────

function CreateApprovalGroupDialog({
  templateVersionId,
  existingGroups,
  onSuccess,
}: {
  templateVersionId: string;
  existingGroups: StepGroup[];
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateStepGroupRequest & { display_order_num: number }>();

  const createStepGroup = useCreateStepGroup();

  const onSubmit = async (data: CreateStepGroupRequest & { display_order_num: number }) => {
    const rejectionActionValue = data.on_rejection_action || "TERMINATE";

    if (rejectionActionValue === "GO_TO_GROUP" && !data.on_rejection_goto_group) {
      setError("on_rejection_goto_group", {
        type: "manual",
        message: "Required",
      });
      return;
    }

    try {
      await createStepGroup.mutateAsync({
        template_version: templateVersionId,
        name: data.name,
        display_order: data.display_order_num,
        parallel_mode: data.parallel_mode || "SINGLE",
        on_rejection_action: rejectionActionValue,
        on_rejection_goto_group: data.on_rejection_goto_group || undefined,
      });
      setOpen(false);
      reset();
      onSuccess?.();
    } catch {
      // error surfaced via mutation
    }
  };

  const submitError =
    createStepGroup.isError && createStepGroup.error instanceof ApiError
      ? createStepGroup.error.message
      : createStepGroup.isError
      ? "Failed to create group"
      : null;

  const nextOrder =
    existingGroups.length > 0
      ? Math.max(...existingGroups.map((g) => g.display_order)) + 1
      : 0;

  const parallelMode = watch("parallel_mode") || "SINGLE";
  const rejectionAction = watch("on_rejection_action") || "TERMINATE";
  const jumpToStage = watch("on_rejection_goto_group") || "";

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Stage
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Approval Stage</DialogTitle>
            <DialogDescription>
              Create a stage in the workflow, such as Marketing Review, Regional Review, or HO Review. After creating the stage, add one or more approval steps inside it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Stage Name" error={errors.name?.message} hint="e.g. Marketing Review, Regional Review, HO Review">
              <Input
                {...register("name", { required: "Required" })}
                placeholder="e.g. Regional Review"
              />
            </FormField>

            <FormField label="Stage Order" error={errors.display_order_num?.message}
              hint={`Next available: ${nextOrder}`}>
              <Input
                type="number"
                min={0}
                defaultValue={nextOrder}
                {...register("display_order_num", { required: "Required", valueAsNumber: true })}
              />
            </FormField>

            <FormField
              label="Approval Mode"
              error={errors.parallel_mode?.message}
              hint="How many approvers in this stage must approve?"
            >
              <Select
                value={parallelMode}
                onValueChange={(v) => setValue("parallel_mode", v as ParallelMode, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PARALLEL_MODE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="If Rejected"
              error={errors.on_rejection_action?.message}
              hint="What happens when any approver in this stage rejects?"
            >
              <Select
                value={rejectionAction}
                onValueChange={(v) => setValue("on_rejection_action", v as RejectionAction, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REJECTION_ACTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {rejectionAction === "GO_TO_GROUP" && (
              <FormField
                label="Jump To Stage"
                error={errors.on_rejection_goto_group?.message}
                hint="On rejection, the record jumps to this stage instead of terminating"
              >
                <select
                  value={jumpToStage}
                  onChange={(e) => setValue("on_rejection_goto_group", e.target.value, { shouldValidate: true })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Select target stage...</option>
                  {existingGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {submitError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createStepGroup.isPending}>
                {createStepGroup.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Add Stage
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Edit Approval Group Dialog ──────────────────────────────────────────────

function EditApprovalGroupDialog({
  group,
  existingGroups,
  onSuccess,
}: {
  group: StepGroup;
  existingGroups: StepGroup[];
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const updateGroup = useUpdateStepGroup();
  const deleteGroup = useDeleteStepGroup();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateStepGroupRequest & { display_order_num: number }>({
    defaultValues: {
      name: group.name,
      display_order_num: group.display_order,
      parallel_mode: group.parallel_mode,
      on_rejection_action: group.on_rejection_action,
      on_rejection_goto_group: group.on_rejection_goto_group ?? undefined,
    },
  });

  const onSubmit = async (data: CreateStepGroupRequest & { display_order_num: number }) => {
    const rejectionActionValue = data.on_rejection_action || "TERMINATE";
    if (rejectionActionValue === "GO_TO_GROUP" && !data.on_rejection_goto_group) {
      setError("on_rejection_goto_group", { type: "manual", message: "Required" });
      return;
    }
    try {
      await updateGroup.mutateAsync({
        id: group.id,
        data: {
          name: data.name,
          display_order: data.display_order_num,
          parallel_mode: data.parallel_mode || "SINGLE",
          on_rejection_action: rejectionActionValue as RejectionAction,
          on_rejection_goto_group: data.on_rejection_goto_group || undefined,
        },
      });
      setOpen(false);
      onSuccess?.();
    } catch {}
  };

  const submitError =
    updateGroup.isError && updateGroup.error instanceof ApiError
      ? updateGroup.error.message
      : updateGroup.isError
      ? "Failed to update group"
      : null;

  const parallelMode = watch("parallel_mode") || group.parallel_mode;
  const rejectionAction = watch("on_rejection_action") || group.on_rejection_action;
  const jumpToStage = watch("on_rejection_goto_group") || group.on_rejection_goto_group || "";

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        onClick={() => setOpen(true)}
      >
        Edit
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Approval Stage</DialogTitle>
            <DialogDescription>
              Update this stage's name, order, approval mode, or rejection behavior.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Stage Name" error={errors.name?.message}>
              <Input
                {...register("name", { required: "Required" })}
                placeholder="e.g. Regional Review"
              />
            </FormField>

            <FormField label="Stage Order" error={errors.display_order_num?.message}>
              <Input
                type="number"
                min={0}
                {...register("display_order_num", { required: "Required", valueAsNumber: true })}
              />
            </FormField>

            <FormField
              label="Approval Mode"
              error={errors.parallel_mode?.message}
              hint="How many approvers in this stage must approve?"
            >
              <Select
                value={parallelMode}
                onValueChange={(v) => setValue("parallel_mode", v as ParallelMode, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PARALLEL_MODE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="If Rejected"
              error={errors.on_rejection_action?.message}
              hint="What happens when any approver in this stage rejects?"
            >
              <Select
                value={rejectionAction}
                onValueChange={(v) => setValue("on_rejection_action", v as RejectionAction, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REJECTION_ACTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {rejectionAction === "GO_TO_GROUP" && (
              <FormField
                label="Jump To Stage"
                error={errors.on_rejection_goto_group?.message}
              >
                <select
                  value={jumpToStage}
                  onChange={(e) => setValue("on_rejection_goto_group", e.target.value, { shouldValidate: true })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Select target stage...</option>
                  {existingGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {submitError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mr-auto"
                onClick={() => {
                  if (confirm(`Delete group "${group.name}"? This cannot be undone.`)) {
                    deleteGroup.mutate(group.id, {
                      onSuccess: () => { setOpen(false); onSuccess?.(); },
                    });
                  }
                }}
                disabled={deleteGroup.isPending}
              >
                {deleteGroup.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateGroup.isPending}>
                  {updateGroup.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : null}
                  Save
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Create Approval Step Dialog ────────────────────────────────────────────────

function CreateApprovalStepDialog({
  groupId,
  versionStatus,
  orgId,
  onSuccess,
}: {
  groupId: string;
  versionStatus: string;
  orgId: string | null;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: roles = [] } = useRoles();
  const { data: nodes = [] } = useScopeNodes(orgId ?? undefined);
  const { data: existingSteps = [] } = useWorkflowSteps(groupId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateWorkflowStepRequest>();

  const createWorkflowStep = useCreateWorkflowStep();

  const onSubmit = async (data: CreateWorkflowStepRequest) => {
    const stepKind = data.step_kind || "NORMAL_APPROVAL";
    if (!data.required_role) {
      setError("required_role", { type: "manual", message: "Required" });
      return;
    }
    if (stepKind === "SPLIT_BY_SCOPE" && !data.split_target_mode) {
      setError("split_target_mode", { type: "manual", message: "Required" });
      return;
    }
    if (stepKind === "NORMAL_APPROVAL" && !data.scope_resolution_policy) {
      setError("scope_resolution_policy", { type: "manual", message: "Required" });
      return;
    }
    if (stepKind === "NORMAL_APPROVAL" && data.scope_resolution_policy === "ANCESTOR_OF_TYPE" && !data.ancestor_node_type) {
      setError("ancestor_node_type", { type: "manual", message: "Required for ancestor policy" });
      return;
    }
    if (stepKind === "NORMAL_APPROVAL" && data.scope_resolution_policy === "FIXED_NODE" && !data.fixed_scope_node) {
      setError("fixed_scope_node", { type: "manual", message: "Required for fixed node policy" });
      return;
    }

    try {
      await createWorkflowStep.mutateAsync({
        group: groupId,
        name: data.name,
        required_role: data.required_role || undefined,
        scope_resolution_policy:
          stepKind === "SPLIT_BY_SCOPE" ? "SUBJECT_NODE" : data.scope_resolution_policy || undefined,
        ancestor_node_type: stepKind === "NORMAL_APPROVAL" ? data.ancestor_node_type || undefined : undefined,
        fixed_scope_node: stepKind === "NORMAL_APPROVAL" ? data.fixed_scope_node || undefined : undefined,
        default_user: data.default_user || undefined,
        display_order: data.display_order,
        step_kind: stepKind,
        split_target_nodes: data.split_target_nodes || undefined,
        split_target_mode: data.split_target_mode || undefined,
        join_policy: data.join_policy || undefined,
      });
      setOpen(false);
      reset();
      onSuccess?.();
    } catch {
      // error surfaced via mutation
    }
  };

  const submitError =
    createWorkflowStep.isError && createWorkflowStep.error instanceof ApiError
      ? createWorkflowStep.error.message
      : createWorkflowStep.isError
      ? "Failed to create step"
      : null;

  const nextOrder =
    existingSteps.length > 0
      ? Math.max(...existingSteps.map((s) => s.display_order)) + 1
      : 0;

  const requiredRole = watch("required_role") || "";
  const scopePolicy = watch("scope_resolution_policy");

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Approver
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Approver Step</DialogTitle>
            <DialogDescription>
              Add the approver rule inside this stage. Choose the business role first, then define how the approver unit is resolved.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Approver Step Name" error={errors.name?.message} hint="e.g. Marketing Executive, HO Executive, HO Head">
            <Input
              {...register("name", { required: "Required" })}
              placeholder="e.g. HO Executive"
            />
          </FormField>

          <FormField label="Step Order In Stage" error={errors.display_order?.message}>
            <Input
              type="number"
              min={0}
              defaultValue={nextOrder}
              {...register("display_order", { required: "Required", valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Step Kind"
            error={errors.step_kind?.message}
            hint="Normal approval is the standard step type"
          >
            <Select
              defaultValue="NORMAL_APPROVAL"
              onValueChange={(v) => {
                setValue("step_kind", v as StepKind);
              }}
            >
              <SelectTrigger data-testid="step-kind-select">
                <SelectValue placeholder="Select step type..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STEP_KIND_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {watch("step_kind") === "SPLIT_BY_SCOPE" && (
            <>
              <FormField
                label="Split Target Mode"
                error={errors.split_target_mode?.message}
                hint="Child nodes auto-resolves to child units of the subject"
              >
                <Select
                  onValueChange={(v) => setValue("split_target_mode", v as SplitTargetMode)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SPLIT_TARGET_MODE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {watch("split_target_mode") === "EXPLICIT_NODES" && (
                <MultiSelectUnits
                  value={watch("split_target_nodes") ?? []}
                  onChange={(ids) => setValue("split_target_nodes", ids)}
                  orgId={orgId ?? undefined}
                  label="Target Units"
                  placeholder="Select target units..."
                  error={errors.split_target_nodes?.message as string | undefined}
                />
              )}

              <FormField
                label="Branch Role"
                error={errors.required_role?.message}
                hint="Role required for branch approvers at each target unit"
              >
                <select
                  value={requiredRole}
                  onChange={(e) => setValue("required_role", e.target.value, { shouldValidate: true })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Select role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </>
          )}

          {watch("step_kind") === "JOIN_BRANCHES" && (
            <FormField
              label="Join Policy"
              error={errors.join_policy?.message}
              hint="When all branches complete, this step advances"
            >
              <Select
                defaultValue="ALL_BRANCHES_MUST_COMPLETE"
                onValueChange={(v) => setValue("join_policy", v as JoinPolicy)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(JOIN_POLICY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          {watch("step_kind") === "RUNTIME_SPLIT_ALLOCATION" && (
            <>
              <FormField
                label="Splitter Role"
                error={errors.required_role?.message}
                hint="Role of the user who performs the invoice split allocation"
              >
                <select
                  value={requiredRole}
                  onChange={(e) => setValue("required_role", e.target.value, { shouldValidate: true })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Select role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Allocation Total Policy" hint="Whether split total must equal invoice amount">
                <select
                  value={watch("allocation_total_policy" as never) ?? "MUST_EQUAL_INVOICE_TOTAL"}
                  onChange={(e) => setValue("allocation_total_policy" as never, e.target.value as never)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="MUST_EQUAL_INVOICE_TOTAL">Must Equal Invoice Total</option>
                  <option value="CAN_BE_PARTIAL">Can Be Partial</option>
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["require_category", "Require Category"],
                    ["require_subcategory", "Require Subcategory"],
                    ["require_budget", "Require Budget"],
                    ["require_campaign", "Require Campaign"],
                    ["allow_multiple_lines_per_entity", "Multiple Lines / Entity"],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="rounded border-input"
                      checked={!!(watch(field as never))}
                      onChange={(e) => setValue(field as never, e.target.checked as never)}
                    />
                    {label}
                  </label>
                ))}
              </div>

              <p className="text-xs text-muted-foreground border border-border rounded-md px-3 py-2 bg-muted/20">
                Save the step first, then open it again to configure split entities.
              </p>
            </>
          )}

          {watch("step_kind") !== "SPLIT_BY_SCOPE" && watch("step_kind") !== "JOIN_BRANCHES" && watch("step_kind") !== "RUNTIME_SPLIT_ALLOCATION" && (
            <>
          <FormField
            label="Required Role"
            error={errors.required_role?.message}
            hint="Select the business role that can approve this step"
          >
            <select
              value={requiredRole}
              onChange={(e) => setValue("required_role", e.target.value, { shouldValidate: true })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Select role...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Approver Unit Resolution"
            error={errors.scope_resolution_policy?.message}
            hint="How is the approver's unit determined?"
          >
            <Select
              onValueChange={(v) => setValue("scope_resolution_policy", v as ScopeResolutionPolicy)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select resolution..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCOPE_RESOLUTION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div>
                      <span>{label}</span>
                      <p className="text-xs text-muted-foreground">{SCOPE_RESOLUTION_HELP[value as ScopeResolutionPolicy]}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {scopePolicy === "ANCESTOR_OF_TYPE" && (
            <FormField
              label="Ancestor Unit Type"
              error={errors.ancestor_node_type?.message}
              hint='e.g. "Department", "Division"'
            >
              <Input
                {...register("ancestor_node_type")}
                placeholder="e.g. Department"
              />
            </FormField>
          )}

          {scopePolicy === "FIXED_NODE" && (
            <FormField label="Fixed Unit" error={errors.fixed_scope_node?.message}>
              <Select onValueChange={(v) => setValue("fixed_scope_node", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit..." />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
            </>
          )}

          <FormField
            label="Default Assignee"
            hint="Optional — pre-assign to a specific user as a fallback"
          >
            <UserPicker
              value={watch("default_user") ?? null}
              onChange={(userId) => setValue("default_user", userId)}
              placeholder="Search by name or email..."
            />
          </FormField>

          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWorkflowStep.isPending}>
                {createWorkflowStep.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Add Approver
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Edit Workflow Template Dialog ──────────────────────────────────────────────

function EditWorkflowTemplateDialog({
  template,
  onUpdated,
  onDeleted,
}: {
  template: WorkflowTemplate;
  onUpdated?: () => void;
  onDeleted?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const { data: nodes = [] } = useScopeNodes(undefined);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<{ name: string; module: string; scope_node: string }>({
    defaultValues: {
      name: template.name,
      module: template.module,
      scope_node: template.scope_node,
    },
  });

  const onSubmit = async (data: { name: string; module: string; scope_node: string }) => {
    try {
      await updateTemplate.mutateAsync({ id: template.id, data });
      setOpen(false);
      onUpdated?.();
    } catch {}
  };

  const submitError =
    updateTemplate.isError && updateTemplate.error instanceof ApiError
      ? updateTemplate.error.message
      : updateTemplate.isError
      ? "Failed to update workflow"
      : null;

  return (
    <>
      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
            <DialogDescription>
              Update the workflow name or change its module assignment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Workflow Name" error={errors.name?.message}>
              <Input
                {...register("name", { required: "Required" })}
                placeholder="e.g. Invoice Approval Flow"
              />
            </FormField>

            <FormField label="Module" error={errors.module?.message}>
              <Select
                defaultValue={template.module}
                onValueChange={(v) => setValue("module", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {submitError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mr-auto"
                onClick={() => {
                  if (confirm(`Delete workflow "${template.name}"? This removes all versions and cannot be undone.`)) {
                    deleteTemplate.mutate(template.id, {
                      onSuccess: () => { setOpen(false); onDeleted?.(template.id); },
                    });
                  }
                }}
                disabled={deleteTemplate.isPending}
              >
                {deleteTemplate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Delete Workflow
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTemplate.isPending}>
                  {updateTemplate.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : null}
                  Save
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Workflow List Card ─────────────────────────────────────────────────────────

function WorkflowCard({
  workflow,
  isSelected,
  onClick,
  nodeMap,
  onUpdated,
  onDeleted,
}: {
  workflow: WorkflowTemplate;
  isSelected: boolean;
  onClick: () => void;
  nodeMap: Record<string, string>;
  onUpdated: () => void;
  onDeleted: (id: string) => void;
}) {
  const liveVersion = workflow.versions.find((v) => v.status === "published");
  const draftVersions = workflow.versions.filter((v) => v.status === "draft");
  const archivedVersions = workflow.versions.filter((v) => v.status === "archived");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={`w-full rounded-lg border px-3 py-3 text-left transition-all ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-transparent hover:bg-accent"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate pr-2 text-sm font-medium text-foreground">{workflow.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={`text-xs ${MODULE_COLORS[workflow.module] ?? ""}`}
            >
              {workflow.module}
            </Badge>
            {workflow.scope_node && nodeMap[workflow.scope_node] && (
              <Badge variant="outline" className="max-w-full text-xs">
                <Building2 className="mr-1 h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{nodeMap[workflow.scope_node]}</span>
              </Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <div className="flex flex-col items-end gap-1">
            {liveVersion ? (
              <StatusBadge status="published" />
            ) : draftVersions.length > 0 ? (
              <Badge className="bg-amber-100 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {draftVersions.length} draft
              </Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {workflow.versions.length} version{workflow.versions.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <EditWorkflowTemplateDialog template={workflow} onUpdated={onUpdated} onDeleted={onDeleted} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Approval Step Dialog ─────────────────────────────────────────────────

function EditApprovalStepDialog({
  step,
  groupId,
  versionStatus,
  orgId,
  onSuccess,
}: {
  step: WorkflowStep;
  groupId: string;
  versionStatus: string;
  orgId: string | null;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: roles = [] } = useRoles();
  const { data: nodes = [] } = useScopeNodes(orgId ?? undefined);
  const { data: existingSteps = [] } = useWorkflowSteps(groupId);
  const updateStep = useUpdateWorkflowStep();
  const deleteStep = useDeleteWorkflowStep();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateWorkflowStepRequest>({
    defaultValues: {
      group: step.group,
      name: step.name,
      required_role: step.required_role ?? undefined,
      scope_resolution_policy: step.scope_resolution_policy,
      ancestor_node_type: step.ancestor_node_type || undefined,
      fixed_scope_node: step.fixed_scope_node ?? undefined,
      default_user: step.default_user ?? undefined,
      display_order: step.display_order,
      step_kind: step.step_kind ?? "NORMAL_APPROVAL",
      split_target_nodes: step.split_target_nodes ?? undefined,
      split_target_mode: step.split_target_mode ?? undefined,
      join_policy: step.join_policy ?? undefined,
      allocation_total_policy: (step as any).allocation_total_policy ?? undefined,
      approver_selection_mode: (step as any).approver_selection_mode ?? undefined,
      require_category: (step as any).require_category ?? false,
      require_subcategory: (step as any).require_subcategory ?? false,
      require_budget: (step as any).require_budget ?? false,
      require_campaign: (step as any).require_campaign ?? false,
      allow_multiple_lines_per_entity: (step as any).allow_multiple_lines_per_entity ?? false,
    },
  });

  const onSubmit = async (data: CreateWorkflowStepRequest) => {
    const stepKind = data.step_kind || "NORMAL_APPROVAL";
    if (!data.required_role) {
      setError("required_role", { type: "manual", message: "Required" });
      return;
    }
    if (stepKind === "SPLIT_BY_SCOPE" && !data.split_target_mode) {
      setError("split_target_mode", { type: "manual", message: "Required" });
      return;
    }
    if (stepKind === "NORMAL_APPROVAL" && !data.scope_resolution_policy) {
      setError("scope_resolution_policy", { type: "manual", message: "Required" });
      return;
    }
    if (stepKind === "NORMAL_APPROVAL" && data.scope_resolution_policy === "ANCESTOR_OF_TYPE" && !data.ancestor_node_type) {
      setError("ancestor_node_type", { type: "manual", message: "Required for ancestor policy" });
      return;
    }
    if (stepKind === "NORMAL_APPROVAL" && data.scope_resolution_policy === "FIXED_NODE" && !data.fixed_scope_node) {
      setError("fixed_scope_node", { type: "manual", message: "Required for fixed node policy" });
      return;
    }
    try {
      await updateStep.mutateAsync({
        id: step.id,
        data: {
          name: data.name,
          required_role: data.required_role || undefined,
          scope_resolution_policy:
            stepKind === "SPLIT_BY_SCOPE" ? "SUBJECT_NODE" : data.scope_resolution_policy || undefined,
          ancestor_node_type: stepKind === "NORMAL_APPROVAL" ? data.ancestor_node_type || undefined : undefined,
          fixed_scope_node: stepKind === "NORMAL_APPROVAL" ? data.fixed_scope_node || undefined : undefined,
          default_user: data.default_user || undefined,
          display_order: data.display_order,
          step_kind: stepKind,
          split_target_nodes: data.split_target_nodes || undefined,
          split_target_mode: data.split_target_mode || undefined,
          join_policy: data.join_policy || undefined,
          allocation_total_policy: data.allocation_total_policy,
          approver_selection_mode: data.approver_selection_mode,
          require_category: data.require_category,
          require_subcategory: data.require_subcategory,
          require_budget: data.require_budget,
          require_campaign: data.require_campaign,
          allow_multiple_lines_per_entity: data.allow_multiple_lines_per_entity,
        },
      });
      setOpen(false);
      onSuccess?.();
    } catch {}
  };

  const submitError =
    updateStep.isError && updateStep.error instanceof ApiError
      ? updateStep.error.message
      : updateStep.isError
      ? "Failed to update step"
      : null;

  const nextOrder =
    existingSteps.length > 0
      ? Math.max(...existingSteps.map((s) => s.display_order)) + 1
      : 0;

  const requiredRole = watch("required_role") || step.required_role || "";
  const scopePolicy = watch("scope_resolution_policy");

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-xs"
        onClick={() => setOpen(true)}
      >
        Edit
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Approver Step</DialogTitle>
            <DialogDescription>
              Update the approver rule for this stage, including role, scope resolution, and optional default assignee.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Approver Step Name" error={errors.name?.message}>
              <Input
                {...register("name", { required: "Required" })}
                placeholder="e.g. HO Executive"
              />
            </FormField>

            <FormField label="Step Order In Stage" error={errors.display_order?.message}>
              <Input
                type="number"
                min={0}
                {...register("display_order", { required: "Required", valueAsNumber: true })}
              />
            </FormField>

            <FormField
              label="Step Kind"
              error={errors.step_kind?.message}
              hint="Normal approval is the standard step type"
            >
              <Select
                defaultValue={step.step_kind ?? "NORMAL_APPROVAL"}
                onValueChange={(v) => setValue("step_kind", v as StepKind)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select step type..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STEP_KIND_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {watch("step_kind") === "SPLIT_BY_SCOPE" && (
              <>
                <FormField
                  label="Split Target Mode"
                  error={errors.split_target_mode?.message}
                  hint="Child nodes auto-resolves to child units of the subject"
                >
                  <Select
                    defaultValue={step.split_target_mode ?? ""}
                    onValueChange={(v) => setValue("split_target_mode", v as SplitTargetMode)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SPLIT_TARGET_MODE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                {watch("split_target_mode") === "EXPLICIT_NODES" && (
                  <MultiSelectUnits
                    value={watch("split_target_nodes") ?? []}
                    onChange={(ids) => setValue("split_target_nodes", ids)}
                    orgId={orgId ?? undefined}
                    label="Target Units"
                    placeholder="Select target units..."
                    error={errors.split_target_nodes?.message as string | undefined}
                  />
                )}

                <FormField
                  label="Branch Role"
                  error={errors.required_role?.message}
                  hint="Role required for branch approvers at each target unit"
                >
                  <select
                    value={requiredRole}
                    onChange={(e) => setValue("required_role", e.target.value, { shouldValidate: true })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select role...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </>
            )}

            {watch("step_kind") === "JOIN_BRANCHES" && (
              <FormField
                label="Join Policy"
                error={errors.join_policy?.message}
                hint="When all branches complete, this step advances"
              >
                <Select
                  defaultValue={step.join_policy ?? "ALL_BRANCHES_MUST_COMPLETE"}
                  onValueChange={(v) => setValue("join_policy", v as JoinPolicy)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(JOIN_POLICY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}

            {watch("step_kind") === "RUNTIME_SPLIT_ALLOCATION" && (
              <>
                <FormField
                  label="Splitter Role"
                  error={errors.required_role?.message}
                  hint="Role of the user who performs the invoice split allocation"
                >
                  <select
                    value={requiredRole}
                    onChange={(e) => setValue("required_role", e.target.value, { shouldValidate: true })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select role...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Allocation Total Policy" hint="Whether split total must equal invoice amount">
                  <select
                    value={watch("allocation_total_policy" as never) ?? "MUST_EQUAL_INVOICE_TOTAL"}
                    onChange={(e) => setValue("allocation_total_policy" as never, e.target.value as never)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="MUST_EQUAL_INVOICE_TOTAL">Must Equal Invoice Total</option>
                    <option value="CAN_BE_PARTIAL">Can Be Partial</option>
                  </select>
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["require_category", "Require Category"],
                      ["require_subcategory", "Require Subcategory"],
                      ["require_budget", "Require Budget"],
                      ["require_campaign", "Require Campaign"],
                      ["allow_multiple_lines_per_entity", "Multiple Lines / Entity"],
                    ] as const
                  ).map(([field, label]) => (
                    <label key={field} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded border-input"
                        checked={!!(watch(field as never))}
                        onChange={(e) => setValue(field as never, e.target.checked as never)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground border border-border rounded-md px-3 py-2 bg-muted/20">
                  Allowed entities and per-entity approver pools are configured per split option (admin setup required).
                </p>

                <SplitOptionsManager stepId={step.id} orgId={orgId} />
              </>
            )}

            {watch("step_kind") !== "SPLIT_BY_SCOPE" && watch("step_kind") !== "JOIN_BRANCHES" && watch("step_kind") !== "RUNTIME_SPLIT_ALLOCATION" && (
              <>
                <FormField
                  label="Required Role"
                  error={errors.required_role?.message}
                  hint="Select the business role that can approve this step"
                >
                  <select
                    value={requiredRole}
                    onChange={(e) => setValue("required_role", e.target.value, { shouldValidate: true })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select role...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Approver Unit Resolution"
                  error={errors.scope_resolution_policy?.message}
                  hint="How is the approver's unit determined?"
                >
                  <Select
                    defaultValue={step.scope_resolution_policy}
                    onValueChange={(v) => setValue("scope_resolution_policy", v as ScopeResolutionPolicy)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resolution..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SCOPE_RESOLUTION_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div>
                            <span>{label}</span>
                            <p className="text-xs text-muted-foreground">{SCOPE_RESOLUTION_HELP[value as ScopeResolutionPolicy]}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                {scopePolicy === "ANCESTOR_OF_TYPE" && (
                  <FormField
                    label="Ancestor Unit Type"
                    error={errors.ancestor_node_type?.message}
                  >
                    <Input
                      {...register("ancestor_node_type")}
                      placeholder="e.g. Department"
                    />
                  </FormField>
                )}

                {scopePolicy === "FIXED_NODE" && (
                  <FormField label="Fixed Unit" error={errors.fixed_scope_node?.message}>
                    <Select
                      defaultValue={step.fixed_scope_node ?? ""}
                      onValueChange={(v) => setValue("fixed_scope_node", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit..." />
                      </SelectTrigger>
                      <SelectContent>
                        {nodes.map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
              </>
            )}

            <FormField
              label="Default Assignee"
              hint="Optional — pre-assign to a specific user as a fallback"
            >
              <UserPicker
                value={watch("default_user") ?? null}
                onChange={(userId) => setValue("default_user", userId)}
                placeholder="Search by name or email..."
              />
            </FormField>

            {submitError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mr-auto"
                onClick={() => {
                  if (confirm(`Delete step "${step.name}"? This cannot be undone.`)) {
                    deleteStep.mutate(step.id, {
                      onSuccess: () => { setOpen(false); onSuccess?.(); },
                    });
                  }
                }}
                disabled={deleteStep.isPending}
              >
                {deleteStep.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateStep.isPending}>
                  {updateStep.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : null}
                  Save
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Approval Pipeline View ─────────────────────────────────────────────────────

function ApprovalPipelineView({
  version,
  orgId,
  onRefresh,
}: {
  version: WorkflowTemplateVersion;
  orgId: string | null;
  onRefresh: () => void;
}) {
  const publishVersion = usePublishVersion();
  const archiveVersion = useArchiveVersion();

  const liveVersion = version;
  const groups = liveVersion.step_groups;
  const isDraft = liveVersion.status === "draft";

  function handlePublish() {
    publishVersion.mutate(liveVersion.id, {
      onSuccess: () => {
        toast.success(`Version ${liveVersion.version_number} is now live.`);
        onRefresh();
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to publish");
      },
    });
  }

  function handleArchive() {
    archiveVersion.mutate(liveVersion.id, {
      onSuccess: () => {
        toast.success(`Version ${liveVersion.version_number} archived.`);
        onRefresh();
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to archive");
      },
    });
  }

  return (
    <div className="space-y-5">
      {/* Version header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Layers className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">Version {liveVersion.version_number}</h3>
              <StatusBadge status={liveVersion.status} />
            </div>
            {liveVersion.published_at && (
              <p className="text-xs text-muted-foreground">
                Published {new Date(liveVersion.published_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && (
            <Button size="sm" className="gap-1.5" onClick={handlePublish} disabled={publishVersion.isPending}>
              {publishVersion.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Globe className="h-3.5 w-3.5" />
              )}
              Publish
            </Button>
          )}
          {liveVersion.status === "published" && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleArchive} disabled={archiveVersion.isPending}>
              {archiveVersion.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Incomplete warning */}
      {isDraft && groups.length === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            This version has no approval stages yet. Add stages and steps below to define the approval flow.
          </p>
        </div>
      )}

      {/* Pipeline stages */}
      {groups.length > 0 ? (
        <div className="relative">
          {/* Vertical pipeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-3 pl-0">
            {groups
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map((group, idx) => (
                <ApprovalGroupCard
                  key={group.id}
                  group={group}
                  isLast={idx === groups.length - 1}
                  versionStatus={liveVersion.status}
                  orgId={orgId}
                  onRefresh={onRefresh}
                />
              ))}
          </div>

          {/* Add group at bottom */}
          {isDraft && (
            <div className="ml-5 mt-3">
              <CreateApprovalGroupDialog
                templateVersionId={liveVersion.id}
                existingGroups={groups}
                onSuccess={onRefresh}
              />
            </div>
          )}
        </div>
      ) : isDraft ? (
        <div className="flex justify-center py-4">
          <CreateApprovalGroupDialog
            templateVersionId={liveVersion.id}
            existingGroups={[]}
            onSuccess={onRefresh}
          />
        </div>
      ) : null}
    </div>
  );
}

// ── Approval Group Card ────────────────────────────────────────────────────────

function ApprovalGroupCard({
  group,
  isLast,
  versionStatus,
  orgId,
  onRefresh,
}: {
  group: StepGroup;
  isLast: boolean;
  versionStatus: string;
  orgId: string | null;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDraft = versionStatus === "draft";

  return (
    <div className="relative pl-10">
      {/* Connector dot on the vertical line */}
      <div className={`absolute left-4.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 bg-background ${
        isLast ? "border-primary" : "border-muted-foreground"
      }`} />

      <div className="rounded-lg border border-border bg-card">
        {/* Group header */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-2.5 text-left"
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                isDraft ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              <CircleDot className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{group.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs">
                  {PARALLEL_MODE_LABELS[group.parallel_mode]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {REJECTION_ACTION_LABELS[group.on_rejection_action]}
                </span>
              </div>
            </div>
          </button>
          <div className="flex items-center gap-1.5">
            {isDraft && (
              <EditApprovalGroupDialog
                group={group}
                existingGroups={[]}
                onSuccess={onRefresh}
              />
            )}
            <span className="text-xs text-muted-foreground">
              {group.steps.length} step{group.steps.length !== 1 ? "s" : ""}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? <X className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Expanded steps */}
        {expanded && (
          <div className="border-t border-border px-4 py-3 space-y-2">
            {group.steps.length > 0 ? (
              group.steps
                .slice()
                .sort((a, b) => a.display_order - b.display_order)
                .map((step) => (
                  <div
                    key={step.id}
                    className="flex items-start justify-between rounded-md border border-border/60 bg-background/60 px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {step.step_kind !== "NORMAL_APPROVAL" && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              step.step_kind === "SPLIT_BY_SCOPE"
                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                                : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
                            }`}
                          >
                            {STEP_KIND_LABELS[step.step_kind as StepKind]}
                          </Badge>
                        )}
                        <p className="text-sm font-medium">{step.name}</p>
                        {step.required_role_name && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="mr-1 h-2.5 w-2.5" />
                            {step.required_role_name}
                          </Badge>
                        )}
                      </div>
                      {step.step_kind === "SPLIT_BY_SCOPE" && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {SPLIT_TARGET_MODE_LABELS[step.split_target_mode as SplitTargetMode]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {step.split_target_mode === "EXPLICIT_NODES"
                              ? `${step.split_target_nodes?.length ?? 0} explicit units`
                              : "child nodes"}
                          </span>
                        </div>
                      )}
                      {step.step_kind === "NORMAL_APPROVAL" && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {SCOPE_RESOLUTION_LABELS[step.scope_resolution_policy]}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate max-w-48">
                            {SCOPE_RESOLUTION_HELP[step.scope_resolution_policy]}
                          </span>
                        </div>
                      )}
                      {step.default_user && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Default: {step.default_user}
                        </p>
                      )}
                    </div>
                    {isDraft && (
                      <EditApprovalStepDialog
                        step={step}
                        groupId={group.id}
                        versionStatus={versionStatus}
                        orgId={orgId}
                        onSuccess={onRefresh}
                      />
                    )}
                  </div>
                ))
            ) : (
              <p className="text-xs text-muted-foreground py-1">
                No steps defined yet.
              </p>
            )}

            {isDraft && (
              <div className="pt-1">
                <CreateApprovalStepDialog
                  groupId={group.id}
                  versionStatus={versionStatus}
                  orgId={orgId}
                  onSuccess={onRefresh}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Draft Version Card (with delete) ───────────────────────────────────────────

function DraftVersionCard({
  version,
  isSelected,
  onSelect,
  onDelete,
}: {
  version: WorkflowTemplateVersion;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const deleteVersion = useDeleteVersion();

  return (
    <div className="flex items-center gap-1.5">
      <button
        data-testid="draft-version-card"
        onClick={onSelect}
        className={`flex-1 text-left rounded-lg border px-3 py-2 transition-all ${
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border hover:bg-accent"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDown className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium">v{version.version_number}</span>
          </div>
          <StatusBadge status="draft" />
        </div>
        {version.step_groups.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {version.step_groups.length} stage{version.step_groups.length !== 1 ? "s" : ""},{" "}
            {version.step_groups.reduce((acc, g) => acc + g.steps.length, 0)} steps
          </p>
        )}
      </button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        title="Delete draft version"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Delete Draft Version v${version.version_number}? This cannot be undone.`)) {
            deleteVersion.mutate(version.id, { onSuccess: onDelete });
          }
        }}
        disabled={deleteVersion.isPending}
      >
        <Loader2 className="h-3 w-3 animate-spin" style={{ display: deleteVersion.isPending ? "block" : "none" }} />
        <X className="h-3 w-3" style={{ display: deleteVersion.isPending ? "none" : "block" }} />
      </Button>
    </div>
  );
}

// ── Version Selector ────────────────────────────────────────────────────────────

function VersionSelector({
  templateId,
  versions,
  selectedVersionId,
  onSelect,
  orgId,
  onRefresh,
}: {
  templateId: string;
  versions: WorkflowTemplateVersion[];
  selectedVersionId: string | null;
  onSelect: (id: string) => void;
  orgId: string | null;
  onRefresh: () => void;
}) {
  const liveVersion = versions.find((v) => v.status === "published");
  const draftVersions = versions.filter((v) => v.status === "draft");
  const archivedVersions = versions.filter((v) => v.status === "archived");
  const [createOpen, setCreateOpen] = useState(false);

  const maxVersion = versions.reduce((max, v) => Math.max(max, v.version_number), 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-background z-10">
        <h3 className="text-sm font-medium text-foreground">Versions</h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-7 px-2"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3 w-3" />
          New Version
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
        <CreateVersionDialog
          templateId={templateId}
          maxVersion={maxVersion}
          onSuccess={onRefresh}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />

        {liveVersion && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Live
            </p>
            <button
              onClick={() => onSelect(liveVersion.id)}
              className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all ${
                selectedVersionId === liveVersion.id
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950"
                  : "border-border hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-sm font-medium">v{liveVersion.version_number}</span>
                </div>
                <StatusBadge status="published" />
              </div>
              {liveVersion.step_groups.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">No approval stages defined</p>
              )}
              {liveVersion.step_groups.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {liveVersion.step_groups.length} approval stage{liveVersion.step_groups.length !== 1 ? "s" : ""}
                </p>
              )}
            </button>
          </div>
        )}

        {draftVersions.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Draft</p>
            <div className="space-y-1.5">
              {draftVersions.map((v) => (
                <DraftVersionCard
                  key={v.id}
                  version={v}
                  isSelected={selectedVersionId === v.id}
                  onSelect={() => onSelect(v.id)}
                  onDelete={() => onRefresh()}
                />
              ))}
            </div>
          </div>
        )}

        {archivedVersions.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Archived</p>
            <div className="space-y-1">
              {archivedVersions.slice(0, 3).map((v) => (
                <button
                  key={v.id}
                  onClick={() => onSelect(v.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2 transition-all ${
                    selectedVersionId === v.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">v{v.version_number}</span>
                    <StatusBadge status="archived" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {versions.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-6 text-center">
            <p className="text-xs text-muted-foreground">No versions yet. Create your first version above.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const WorkflowConfigPage = () => {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { data: nodes = [], isLoading: nodesLoading } = useScopeNodes(
    selectedOrgId ?? undefined,
  );

  const { data: templates = [], isLoading: templatesLoading, refetch: refetchTemplates } = useTemplates(
    selectedNodeId ? { scope_node: selectedNodeId } : undefined,
  );

  const { data: versions = [], refetch: refetchVersions } = useVersions(
    selectedTemplateId ? { template: selectedTemplateId } : undefined,
  );

  const { data: allNodes = [] } = useScopeNodes();

  // Build node name map for display
  const nodeMap: Record<string, string> = {};
  allNodes.forEach((n) => { nodeMap[n.id] = n.name; });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const selectedVersion = versions.find((v) => v.id === selectedVersionId);

  // When template changes, reset version
  function handleSelectTemplate(id: string) {
    setSelectedTemplateId(id);
    setSelectedVersionId(null);
  }

  // When template created, select it
  function handleTemplateCreated(id: string) {
    setSelectedTemplateId(id);
    setSelectedVersionId(null);
  }

  // Auto-select live version when template selected
  const liveVersion = versions.find((v) => v.status === "published");
  const firstDraft = versions.find((v) => v.status === "draft");

  function handleVersionRefresh() {
    refetchVersions();
  }

  // Reconcile selectedVersionId when versions change — handles version deletion
  // without relying on stale closure data from the pre-refetch array.
  useEffect(() => {
    if (!selectedVersionId) return;
    if (versions.find((v) => v.id === selectedVersionId)) return;
    const live = versions.find((v) => v.status === "published");
    const draft = versions.find((v) => v.status === "draft");
    setSelectedVersionId(live?.id ?? draft?.id ?? null);
  }, [versions, selectedVersionId]);

  function handleTemplateDeleted(templateId: string) {
    refetchTemplates();
    // If the deleted template was selected, clear both selections
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(null);
      setSelectedVersionId(null);
    }
  }

  return (
    <V2Shell
      title="Workflow Setup"
      titleIcon={<GitBranch className="h-5 w-5 text-muted-foreground" />}
      orgSelector={
        orgsLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Org</span>
            <Select
              value={selectedOrgId ?? ""}
              onValueChange={(v) => {
                setSelectedOrgId(v);
                setSelectedNodeId(null);
                setSelectedTemplateId(null);
                setSelectedVersionId(null);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All organizations" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      }
      unitSelector={
        nodesLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Unit</span>
            <Select
              value={selectedNodeId ?? ""}
              onValueChange={(v) => {
                setSelectedNodeId(v);
                setSelectedTemplateId(null);
                setSelectedVersionId(null);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All units" />
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
        )
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Left: workflow list */}
        <aside className="flex w-[20rem] shrink-0 flex-col border-r border-border bg-background xl:w-[22rem]">
          {/* Header + create */}
          <div className="border-b border-border p-3">
            <p className="text-xs text-muted-foreground mb-2">
              Define approval flows for each module and unit.
            </p>
            <Button
              size="sm"
              className="gap-1.5 w-full"
              onClick={() => setCreateOpen(true)}
              disabled={!selectedNodeId}
            >
              <Plus className="h-3.5 w-3.5" />
              New Workflow
            </Button>
          </div>

          {/* Workflow list */}
          <ScrollArea className="flex-1">
            {templatesLoading ? (
              <PageLoading />
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <GitBranch className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedNodeId ? "No workflows yet" : "Select a unit first"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedNodeId
                      ? "Create a workflow for this unit to get started."
                      : "Choose an organization and unit to see its workflows."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {templates.map((t) => (
                  <WorkflowCard
                    key={t.id}
                    workflow={t}
                    isSelected={selectedTemplateId === t.id}
                    onClick={() => handleSelectTemplate(t.id)}
                    nodeMap={nodeMap}
                    onUpdated={refetchTemplates}
                    onDeleted={handleTemplateDeleted}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Right: workflow detail */}
        <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-secondary/5">
          {!selectedTemplateId ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <GitBranch className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Select a workflow
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose a workflow from the list to view its versions and approval stages.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
              {/* Left: versions */}
              <div className="w-[16rem] shrink-0 overflow-y-auto border-r border-border bg-background p-4 xl:w-[18rem]">
                <VersionSelector
                  templateId={selectedTemplateId}
                  versions={versions}
                  selectedVersionId={selectedVersionId}
                  onSelect={setSelectedVersionId}
                  orgId={selectedOrgId}
                  onRefresh={handleVersionRefresh}
                />
              </div>

              {/* Right: pipeline view */}
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5">
                {!selectedVersionId ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <Layers className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Select a version
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Choose the live version to see the current approval flow, or a draft to continue editing.
                      </p>
                    </div>
                  </div>
                ) : selectedVersion ? (
                  <ApprovalPipelineView
                    version={selectedVersion}
                    orgId={selectedOrgId}
                    onRefresh={handleVersionRefresh}
                  />
                ) : null}
              </div>
            </div>
          )}
        </main>
      </div>

      <CreateWorkflowDialog
        nodeId={selectedNodeId}
        orgId={selectedOrgId}
        onSuccess={handleTemplateCreated}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </V2Shell>
  );
};

// ── Split Options Manager (RUNTIME_SPLIT_ALLOCATION config) ───────────────────

function SplitOptionsManager({ stepId, orgId }: { stepId: string; orgId: string | null }) {
  const { data: options = [], isLoading } = useSplitOptionsAdmin({ workflow_step: stepId });
  const createOpt = useCreateSplitOption();
  const updateOpt = useUpdateSplitOption();
  const deleteOpt = useDeleteSplitOption();
  const { data: nodes = [] } = useScopeNodes(orgId ?? undefined);
  const { data: roles = [] } = useRoles();
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Split Entities ({options.length})
        </button>
        <SplitOptionForm
          stepId={stepId}
          onSubmit={async (data) => {
            try {
              await createOpt.mutateAsync({ ...data, workflow_step: stepId });
            } catch {}
          }}
          trigger={
            <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
              <Plus className="h-3 w-3" /> Add Entity
            </button>
          }
        />
      </div>

      {!collapsed && options.length === 0 && (
        <p className="text-xs text-muted-foreground pl-5">No entities configured yet.</p>
      )}

      {!collapsed && options.map((opt) => (
        <div key={opt.id} className="border border-border rounded-md p-2 text-xs space-y-1">
          {editingId === opt.id ? (
            <SplitOptionForm
              stepId={stepId}
              initial={opt}
              onSubmit={async (data) => {
                try {
                  await updateOpt.mutateAsync({ id: opt.id, data });
                  setEditingId(null);
                } catch {}
              }}
              onCancel={() => setEditingId(null)}
              trigger={<span />}
            />
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-medium">{opt.entity_name ?? opt.entity}</span>
                {opt.approver_role_name && (
                  <p className="text-muted-foreground">Role: {opt.approver_role_name}</p>
                )}
                {opt.category_name && <p className="text-muted-foreground">Cat: {opt.category_name}</p>}
                {opt.campaign_name && <p className="text-muted-foreground">Camp: {opt.campaign_name}</p>}
                {opt.budget_name && <p className="text-muted-foreground">Bud: {opt.budget_name}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingId(opt.id)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteOpt.mutate(opt.id)}
                  className="text-xs text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SplitOptionForm({
  stepId,
  initial,
  onSubmit,
  onCancel,
  trigger,
}: {
  stepId: string;
  initial?: WorkflowSplitOption;
  onSubmit: (data: {
    entity: number;
    approver_role?: number | null;
    allowed_approvers?: number[];
    category?: number | null;
    subcategory?: number | null;
    campaign?: number | null;
    budget?: number | null;
    is_active?: boolean;
    display_order?: number;
  }) => Promise<void>;
  onCancel?: () => void;
  trigger: React.ReactNode;
}) {
  const { data: nodes = [] } = useScopeNodes(undefined);
  const { data: roles = [] } = useRoles();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    entity: initial?.entity ?? "",
    approver_role: initial?.approver_role ?? "",
    category: initial?.category ?? "",
    subcategory: initial?.subcategory ?? "",
    campaign: initial?.campaign ?? "",
    budget: initial?.budget ?? "",
    is_active: initial?.is_active ?? true,
  });

  const handleOpen = () => {
    if (initial) {
      setForm({
        entity: initial.entity ?? "",
        approver_role: initial.approver_role ?? "",
        category: initial.category ?? "",
        subcategory: initial.subcategory ?? "",
        campaign: initial.campaign ?? "",
        budget: initial.budget ?? "",
        is_active: initial.is_active ?? true,
      });
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    await onSubmit({
      entity: Number(form.entity),
      approver_role: form.approver_role ? Number(form.approver_role) : undefined,
      category: form.category ? Number(form.category) : undefined,
      subcategory: form.subcategory ? Number(form.subcategory) : undefined,
      campaign: form.campaign ? Number(form.campaign) : undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      is_active: form.is_active,
    });
    setOpen(false);
  };

  if (!open) {
    return <div onClick={handleOpen}>{trigger}</div>;
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-md p-2 space-y-2 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground">Entity *</span>
          <select
            value={form.entity}
            onChange={(e) => setForm((f) => ({ ...f, entity: e.target.value }))}
            className="border rounded px-1 py-0.5 text-xs"
          >
            <option value="">Select...</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground">Approver Role</span>
          <select
            value={form.approver_role}
            onChange={(e) => setForm((f) => ({ ...f, approver_role: e.target.value }))}
            className="border rounded px-1 py-0.5 text-xs"
          >
            <option value="">None</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground">Category</span>
          <input
            type="number"
            placeholder="Category ID"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="border rounded px-1 py-0.5 text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground">Subcategory</span>
          <input
            type="number"
            placeholder="Subcategory ID"
            value={form.subcategory}
            onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
            className="border rounded px-1 py-0.5 text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground">Campaign</span>
          <input
            type="number"
            placeholder="Campaign ID"
            value={form.campaign}
            onChange={(e) => setForm((f) => ({ ...f, campaign: e.target.value }))}
            className="border rounded px-1 py-0.5 text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground">Budget</span>
          <input
            type="number"
            placeholder="Budget ID"
            value={form.budget}
            onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
            className="border rounded px-1 py-0.5 text-xs"
          />
        </label>
      </div>
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
        />
        Active
      </label>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          className="px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] hover:bg-blue-700"
        >
          {initial ? "Update" : "Add"}
        </button>
        {onCancel ? (
          <button onClick={onCancel} className="px-2 py-0.5 border rounded text-[11px]">Cancel</button>
        ) : (
          <button onClick={() => setOpen(false)} className="px-2 py-0.5 border rounded text-[11px]">Cancel</button>
        )}
      </div>
    </div>
  );
}

export default WorkflowConfigPage;
