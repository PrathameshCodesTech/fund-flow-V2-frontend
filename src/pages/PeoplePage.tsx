import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { V2Shell } from "@/components/v2/V2Shell";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useSendPasswordReset,
  useWorkflowResponsibilities,
  useReassignWorkflowResponsibilities,
} from "@/lib/hooks/useV2Users";
import { useRoles } from "@/lib/hooks/useAccess";
import { useScopeNodes } from "@/lib/hooks/useScopeNodes";
import {
  getUserFullName,
  type V2User,
  type CreateUserRequest,
  type UpdateUserRequest,
  type WorkflowResponsibilityPreview,
} from "@/lib/types/v2user";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users,
  Search,
  Plus,
  Loader2,
  Mail,
  UserCheck,
  UserX,
  ArrowRight,
  ShieldCheck,
  Pencil,
  RefreshCw,
  GitBranch,
  ListChecks,
  AlertTriangle,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getUserType(user: V2User): "vendor" | "internal" {
  return user.user_type === "vendor" || user.is_vendor_portal_user ? "vendor" : "internal";
}

function getUserTypeLabel(user: V2User): string {
  return getUserType(user) === "vendor" ? "Vendor" : "Internal";
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function PageLoading() {
  return (
    <div className="flex h-32 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

// ── Add Person Dialog ──────────────────────────────────────────────────────────

interface AddPersonForm {
  first_name: string;
  last_name: string;
  email: string;
  employee_id: string;
  role: string;
  scope_node: string;
}

function AddPersonDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createUser = useCreateUser();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: scopeNodes = [], isLoading: scopeNodesLoading } = useScopeNodes();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddPersonForm>({
    defaultValues: {
      first_name: "", last_name: "", email: "", employee_id: "", role: "", scope_node: "",
    },
  });

  const selectedScopeId = watch("scope_node");
  const selectedRoleId = watch("role");
  const selectedScope = useMemo(
    () => scopeNodes.find((node) => String(node.id) === selectedScopeId),
    [scopeNodes, selectedScopeId],
  );
  const availableRoles = useMemo(
    () => roles.filter((role) => (
      role.is_active
      && (!selectedScope || (
        String(role.org) === String(selectedScope.org)
        && (!role.node_type_scope || role.node_type_scope === selectedScope.node_type)
      ))
    )),
    [roles, selectedScope],
  );

  function onSubmit(data: AddPersonForm) {
    const payload: CreateUserRequest = {
      email: data.email,
      first_name: data.first_name || undefined,
      last_name: data.last_name || undefined,
      employee_id: data.employee_id || undefined,
      role: data.role,
      scope_node: data.scope_node,
    };
    createUser.mutate(payload, {
      onSuccess: () => {
        toast.success("User added with role-based access.");
        reset();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to add user.");
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }} aria-describedby={undefined}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Create an internal user and assign their role-based access in one step.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ap-first">First name</Label>
              <Input
                id="ap-first"
                placeholder="Jane"
                {...register("first_name")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ap-last">Last name</Label>
              <Input
                id="ap-last"
                placeholder="Smith"
                {...register("last_name")}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ap-email">Email <span className="text-destructive">*</span></Label>
            <Input
              id="ap-email"
              type="email"
              placeholder="jane.smith@company.com"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ap-emp">Employee ID</Label>
            <Input
              id="ap-emp"
              placeholder="Optional"
              {...register("employee_id")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ap-scope">Scope <span className="text-destructive">*</span></Label>
            <Select
              value={selectedScopeId}
              onValueChange={(value) => {
                setValue("scope_node", value, { shouldValidate: true });
                setValue("role", "", { shouldValidate: true });
              }}
              disabled={scopeNodesLoading}
            >
              <SelectTrigger id="ap-scope">
                <SelectValue placeholder={scopeNodesLoading ? "Loading scopes..." : "Select scope"} />
              </SelectTrigger>
              <SelectContent>
                {scopeNodes.filter((node) => node.is_active).map((node) => (
                  <SelectItem key={node.id} value={String(node.id)}>
                    {node.name} ({node.node_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register("scope_node", { required: "Scope is required" })} />
            {errors.scope_node && <p className="text-xs text-destructive">{errors.scope_node.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ap-role">Role <span className="text-destructive">*</span></Label>
            <Select
              value={selectedRoleId}
              onValueChange={(value) => setValue("role", value, { shouldValidate: true })}
              disabled={!selectedScope || rolesLoading}
            >
              <SelectTrigger id="ap-role">
                <SelectValue placeholder={rolesLoading ? "Loading roles..." : "Select role"} />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register("role", { required: "Role is required" })} />
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            The selected role automatically applies its configured capabilities at this scope.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); reset(); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Add User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Person Dialog ─────────────────────────────────────────────────────────

interface EditPersonForm {
  first_name: string;
  last_name: string;
  employee_id: string;
}

function EditPersonDialog({
  person,
  open,
  onOpenChange,
}: {
  person: V2User;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateUser = useUpdateUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditPersonForm>({
    defaultValues: {
      first_name: person.first_name,
      last_name: person.last_name,
      employee_id: person.employee_id ?? "",
    },
  });

  function onSubmit(data: EditPersonForm) {
    const payload: UpdateUserRequest = {
      first_name: data.first_name || undefined,
      last_name: data.last_name || undefined,
      employee_id: data.employee_id || undefined,
    };
    updateUser.mutate({ id: person.id, data: payload }, {
      onSuccess: () => {
        toast.success("Details updated.");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to update.");
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }} aria-describedby={undefined}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Edit Details</DialogTitle>
          <DialogDescription>
            Update profile information for {getUserFullName(person)}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ep-first">First name</Label>
              <Input id="ep-first" {...register("first_name")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ep-last">Last name</Label>
              <Input id="ep-last" {...register("last_name")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ep-email">Email</Label>
            <Input id="ep-email" value={person.email} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ep-emp">Employee ID</Label>
            <Input
              id="ep-emp"
              placeholder="Optional"
              {...register("employee_id")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); reset(); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Workflow Responsibility Reassignment ─────────────────────────────────────

function WorkflowReassignmentDialog({
  person,
  preview,
  open,
  onOpenChange,
}: {
  person: V2User;
  preview: WorkflowResponsibilityPreview;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [replacementUserId, setReplacementUserId] = useState("");
  const [reason, setReason] = useState("");
  const reassign = useReassignWorkflowResponsibilities();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReplacementUserId("");
      setReason("");
      reassign.reset();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!replacementUserId || !reason.trim()) return;
    try {
      const result = await reassign.mutateAsync({
        id: person.id,
        newUser: replacementUserId,
        reason: reason.trim(),
      });
      toast.success(`${result.total_reassigned} workflow responsibilities reassigned.`);
      handleOpenChange(false);
    } catch {
      // Mutation error is displayed below.
    }
  };

  const errorMessage = reassign.isError
    ? reassign.error instanceof Error
      ? reassign.error.message
      : "Failed to reassign workflow responsibilities."
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reassign Workflow Responsibilities</DialogTitle>
          <DialogDescription>
            Move all pending workflow work from {getUserFullName(person)} to one eligible user.
            Completed history remains with the original user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border p-3 text-center">
              <p className="text-lg font-semibold">{preview.counts.total}</p>
              <p className="text-xs text-muted-foreground">Total pending</p>
            </div>
            <div className="rounded-md border border-border p-3 text-center">
              <p className="text-lg font-semibold">{preview.counts.steps}</p>
              <p className="text-xs text-muted-foreground">Steps</p>
            </div>
            <div className="rounded-md border border-border p-3 text-center">
              <p className="text-lg font-semibold">{preview.counts.branches}</p>
              <p className="text-xs text-muted-foreground">Branches</p>
            </div>
          </div>

          <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border p-2">
            {preview.responsibilities.map((item) => (
              <div key={`${item.task_kind}-${item.task_id}`} className="rounded-md bg-secondary/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.subject_label}
                      {item.vendor_name ? ` | ${item.vendor_name}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.step_name} | {item.required_role}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {item.task_kind}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.scope_node_name}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Replacement User *</Label>
            <Select value={replacementUserId} onValueChange={setReplacementUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select eligible replacement" />
              </SelectTrigger>
              <SelectContent>
                {preview.eligible_replacements.map((candidate) => (
                  <SelectItem key={candidate.id} value={String(candidate.id)}>
                    {candidate.display_name} | {candidate.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {preview.eligible_replacements.length === 0 ? (
              <p className="text-xs text-amber-600">
                No active user is eligible for every pending responsibility.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason for replacing this workflow assignee"
              rows={3}
            />
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={reassign.isPending || !replacementUserId || !reason.trim()}
          >
            {reassign.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Reassign All Pending Work
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Person Detail Panel ────────────────────────────────────────────────────────

function PersonDetailPanel({
  person,
  onClose,
  onEdit,
  onToggleActive,
  onSendPasswordReset,
  togglingActive,
  resettingPassword,
}: {
  person: V2User;
  onClose: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onSendPasswordReset: () => void;
  togglingActive: boolean;
  resettingPassword: boolean;
}) {
  const navigate = useNavigate();
  const [reassignOpen, setReassignOpen] = useState(false);
  const isInternalUser = getUserType(person) === "internal";
  const responsibilities = useWorkflowResponsibilities(person.id, isInternalUser);
  const pendingResponsibilityCount = responsibilities.data?.counts.total ?? 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {getUserFullName(person)}
            </h2>
            <p className="text-xs text-muted-foreground">{person.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline">
            {getUserTypeLabel(person)}
          </Badge>
          <Badge
            variant={person.is_active ? "default" : "secondary"}
            className={person.is_active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" : ""}
          >
            {person.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-5">
          {/* Key facts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="mb-1 flex items-center gap-1">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Work Email</p>
              </div>
              <p className="text-sm font-medium">{person.email}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="mb-1 flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Joined</p>
              </div>
              <p className="text-sm font-medium">{formatDate(person.date_joined)}</p>
            </div>
          </div>

          {/* Full name */}
          <div className="rounded-lg border border-border bg-secondary/20 p-3">
            <div className="mb-1 flex items-center gap-1">
              <p className="text-xs text-muted-foreground">Full Name</p>
            </div>
            <p className="text-sm font-medium">
              {[person.first_name, person.last_name].filter(Boolean).join(" ") || "—"}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-secondary/20 p-3">
            <div className="mb-1 flex items-center gap-1">
              <p className="text-xs text-muted-foreground">Account Type</p>
            </div>
            <p className="text-sm font-medium">{getUserTypeLabel(person)}</p>
            {getUserType(person) === "vendor" && person.vendor_name && (
              <p className="mt-1 text-xs text-muted-foreground">{person.vendor_name}</p>
            )}
          </div>

          {/* Employee ID */}
          {person.employee_id && (
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="mb-1 flex items-center gap-1">
                <p className="text-xs text-muted-foreground">Employee ID</p>
              </div>
              <p className="text-sm font-medium">{person.employee_id}</p>
            </div>
          )}

          {isInternalUser ? (
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium">Workflow Responsibilities</p>
                  </div>
                  {responsibilities.isLoading ? (
                    <p className="mt-2 text-xs text-muted-foreground">Loading pending work...</p>
                  ) : responsibilities.isError ? (
                    <p className="mt-2 text-xs text-destructive">Unable to load workflow responsibilities.</p>
                  ) : (
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ListChecks className="h-3 w-3" />
                        {responsibilities.data?.counts.steps ?? 0} steps
                      </span>
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {responsibilities.data?.counts.branches ?? 0} branches
                      </span>
                    </div>
                  )}
                </div>
                {responsibilities.data && pendingResponsibilityCount > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    onClick={() => setReassignOpen(true)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reassign
                  </Button>
                ) : null}
              </div>
              {pendingResponsibilityCount > 0 ? (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Reassign pending work before deactivating this user.
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Actions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={onEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Details
              </Button>
              <Button
                variant={person.is_active ? "destructive" : "default"}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={onToggleActive}
                disabled={togglingActive || (person.is_active && pendingResponsibilityCount > 0)}
              >
                {togglingActive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : person.is_active ? (
                  <UserX className="h-3.5 w-3.5" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
                {person.is_active ? "Deactivate" : "Activate"}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={onSendPasswordReset}
              disabled={resettingPassword}
            >
              {resettingPassword ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              Send Password Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => navigate("/access-control")}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Manage Access
              <ArrowRight className="ml-auto h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </ScrollArea>
      {responsibilities.data ? (
        <WorkflowReassignmentDialog
          person={person}
          preview={responsibilities.data}
          open={reassignOpen}
          onOpenChange={setReassignOpen}
        />
      ) : null}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PeoplePage = () => {
  const [selectedPerson, setSelectedPerson] = useState<V2User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");

  const params: { q?: string; is_active?: boolean; user_type?: "internal" | "vendor" } = {};
  if (search.trim().length >= 1) {
    params.q = search.trim();
  }
  if (statusFilter !== "all") {
    params.is_active = statusFilter === "active";
  }
  if (userTypeFilter === "internal" || userTypeFilter === "vendor") {
    params.user_type = userTypeFilter;
  }
  const queryParams = Object.keys(params).length > 0 ? params : undefined;

  const { data: people = [], isLoading, error } = useUsers(queryParams);
  const updateUser = useUpdateUser();
  const sendPasswordReset = useSendPasswordReset();

  function handleToggleActive(person: V2User) {
    updateUser.mutate(
      { id: person.id, data: { is_active: !person.is_active } },
      {
        onSuccess: (updated) => {
          toast.success(
            updated.is_active
              ? `${getUserFullName(updated)} activated.`
              : `${getUserFullName(updated)} deactivated.`
          );
          setSelectedPerson(updated);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to update status.");
        },
      }
    );
  }

  function handleSendPasswordReset(person: V2User) {
    sendPasswordReset.mutate(person.id, {
      onSuccess: (res) => {
        toast.success(`Password reset email sent to ${res.email}.`);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to send password reset email.");
      },
    });
  }

  return (
    <V2Shell
      title="Users"
      titleIcon={<Users className="h-5 w-5 text-muted-foreground" />}
      actions={
        <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add User
        </Button>
      }
    >
      <div className="flex flex-col md:flex-row min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Left panel: search + list */}
        <aside className="flex w-full md:w-80 shrink-0 flex-col overflow-hidden border-b border-border md:border-b-0 md:border-r bg-background max-h-[45vh] md:max-h-none xl:w-96">
          {/* Search */}
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="inactive">Inactive only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="internal">Internal users</SelectItem>
                  <SelectItem value="vendor">Vendor users</SelectItem>
                </SelectContent>
              </Select>
              {!isLoading && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {people.length} {people.length === 1 ? "person" : "people"}
                </span>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Roles and permissions are managed in{" "}
              <button
                onClick={() => window.location.href = "/access-control"}
                className="text-primary hover:underline"
              >
                Access Management
              </button>
              .
            </p>
          </div>

          {/* List */}
          <ScrollArea className="min-h-0 flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-destructive">Failed to load people.</div>
            ) : people.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {search ? "No results found" : "No people yet"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {search ? "Try a different search term." : "Add people to the platform to get started."}
                  </p>
                </div>
                {!search && (
                  <Button size="sm" className="gap-1.5 mt-1" onClick={() => setAddOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add User
                  </Button>
                )}
              </div>
            ) : (
              <div className="py-1">
                {people.map((person) => {
                  const isSelected = selectedPerson?.id === person.id;
                  return (
                    <button
                      key={person.id}
                      onClick={() => setSelectedPerson(person)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                        isSelected ? "bg-accent" : ""
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          person.is_active
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {getUserFullName(person)
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {getUserFullName(person)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {person.email}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            {getUserTypeLabel(person)}
                          </Badge>
                          {getUserType(person) === "vendor" && person.vendor_name && (
                            <span className="truncate text-[10px] text-muted-foreground">
                              {person.vendor_name}
                            </span>
                          )}
                        </div>
                      </div>
                      {person.is_active ? (
                        <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      ) : (
                        <UserX className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Right panel: person detail */}
        <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-secondary/5">
          {selectedPerson ? (
            <PersonDetailPanel
              person={selectedPerson}
              onClose={() => setSelectedPerson(null)}
              onEdit={() => setEditOpen(true)}
              onToggleActive={() => handleToggleActive(selectedPerson)}
              onSendPasswordReset={() => handleSendPasswordReset(selectedPerson)}
              togglingActive={updateUser.isPending}
              resettingPassword={sendPasswordReset.isPending}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Select a person</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose someone from the list to view their details and manage their access.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <AddPersonDialog open={addOpen} onOpenChange={setAddOpen} />
      {selectedPerson && (
        <EditPersonDialog
          person={selectedPerson}
          open={editOpen}
          onOpenChange={(v) => { setEditOpen(v); if (!v) setSelectedPerson(null); }}
        />
      )}
    </V2Shell>
  );
};

export default PeoplePage;
