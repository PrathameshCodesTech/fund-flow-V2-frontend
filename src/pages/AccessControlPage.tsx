import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { V2Shell } from "@/components/v2/V2Shell";
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useToggleRoleActive,
  usePermissions,
  useRolePermissions,
  useGrantPermission,
  useRevokePermission,
  useUserRoleAssignments,
  useCreateUserRoleAssignment,
  useDeleteUserRoleAssignment,
  useUserScopeAssignments,
} from "@/lib/hooks/useAccess";
import { useOrganizations, useScopeNodes } from "@/lib/hooks/useScopeNodes";
import { useUsers } from "@/lib/hooks/useV2Users";
import { getUserFullName } from "@/lib/types/v2user";
import type {
  Role,
  CreateRoleRequest,
  CreateUserRoleAssignmentRequest,
  Permission,
  RolePermission,
} from "@/lib/types/access";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UserPicker } from "@/components/v2/UserPicker";
import {
  Shield,
  Users,
  Network,
  ScrollText,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function PageLoading() {
  return (
    <div className="flex h-32 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-secondary/20 px-6 py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

// ── Permission catalog grouping ───────────────────────────────────────────────

const RESOURCE_LABELS: Record<string, string> = {
  invoice: "Invoices",
  campaign: "Campaigns",
  vendor: "Vendors",
  workflow: "Workflows",
  budget: "Budgets",
  module: "Modules",
  access: "Access Control",
  iam: "Identity & Access",
};

const ACTION_LABELS: Record<string, string> = {
  view: "Can view",
  manage: "Can manage",
  create: "Can create",
  update: "Can update",
  delete: "Can delete",
  approve: "Can approve",
  reject: "Can reject",
  assign: "Can assign",
  activate: "Can activate",
};

function PermissionCatalog() {
  const { data: permissions = [], isLoading } = usePermissions();

  if (isLoading) return <PageLoading />;

  const grouped: Record<string, Permission[]> = {};
  for (const p of permissions) {
    if (!grouped[p.resource]) grouped[p.resource] = [];
    grouped[p.resource].push(p);
  }

  const sortedResources = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        Permissions are system-defined. They are assigned to roles, and roles are granted to users at specific units.
      </div>

      {sortedResources.map((resource) => {
        const label = RESOURCE_LABELS[resource] ?? resource;
        const perms = grouped[resource];
        return (
          <div key={resource}>
            <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ChevronRight className="h-3 w-3" />
              {label}
            </h4>
            <div className="space-y-1.5">
              {perms.map((p) => {
                const actionLabel =
                  ACTION_LABELS[p.action] ??
                  p.action.charAt(0).toUpperCase() + p.action.slice(1);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">
                        {actionLabel}
                      </span>
                      {p.description && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          — {p.description}
                        </span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {p.resource}.{p.action}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Roles Tab ─────────────────────────────────────────────────────────────────

function RolesTab({
  orgId,
  nodes,
}: {
  orgId: string | null;
  nodes: Array<{ id: string; name: string; code: string }>;
}) {
  const { data: roles = [], isLoading: rolesLoading } = useRoles(orgId ?? undefined);
  const { data: allPermissions = [] } = usePermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const toggleActive = useToggleRoleActive();

  // Manage role permissions
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permPanelOpen, setPermPanelOpen] = useState(false);
  const { data: rolePerms = [], isLoading: rpLoading } = useRolePermissions(
    selectedRole?.id,
  );
  const grantPermission = useGrantPermission();
  const revokePermission = useRevokePermission();

  const grantedIds = new Set(rolePerms.map((rp) => rp.permission));

  // Group permissions by resource
  const groupedPerms: Record<string, Permission[]> = {};
  for (const p of allPermissions) {
    if (!groupedPerms[p.resource]) groupedPerms[p.resource] = [];
    groupedPerms[p.resource].push(p);
  }

  // Create role dialog
  const [createOpen, setCreateOpen] = useState(false);
  const {
    register: regCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    setValue: setValueCreate,
    formState: { errors: errorsCreate },
  } = useForm<CreateRoleRequest>({
    defaultValues: { name: "", code: "", node_type_scope: "" },
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit role dialog
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const {
    register: regEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    setValue: setValueEdit,
    formState: { errors: errorsEdit },
  } = useForm<{ name: string; code: string; node_type_scope: string }>();
  const [editError, setEditError] = useState<string | null>(null);

  const onCreateSubmit = async (data: CreateRoleRequest) => {
    if (!orgId) return;
    setCreateError(null);
    try {
      await createRole.mutateAsync({ ...data, org });
      setCreateOpen(false);
      resetCreate();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create role.");
    }
  };

  const onEditSubmit = async (data: { name: string; code: string; node_type_scope: string }) => {
    if (!editRole) return;
    setEditError(null);
    try {
      await updateRole.mutateAsync({ id: editRole.id, data });
      setEditOpen(false);
      setEditRole(null);
      resetEdit();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Failed to update role.");
    }
  };

  const openPermPanel = (role: Role) => {
    setSelectedRole(role);
    setPermPanelOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setEditRole(role);
    resetEdit({
      name: role.name,
      code: role.code,
      node_type_scope: role.node_type_scope ?? "",
    });
    setEditOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Create role button */}
      {orgId && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Roles</p>
            <p className="text-xs text-muted-foreground">
              Roles define a reusable set of permissions. Once created, assign permissions and grant the role to users.
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Create Role
          </Button>
        </div>
      )}

      {!orgId && (
        <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
          Select an organization to manage roles.
        </div>
      )}

      {/* Role list */}
      {rolesLoading ? (
        <PageLoading />
      ) : roles.length === 0 ? (
        <EmptyState message="No roles defined yet. Create the first role to get started." />
      ) : (
        <div className="space-y-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{role.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs">{role.code}</Badge>
                    {role.node_type_scope && (
                      <Badge variant="secondary" className="text-xs">{role.node_type_scope}</Badge>
                    )}
                    {!role.is_active && (
                      <Badge variant="destructive" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-xs"
                  onClick={() => openEditDialog(role)}
                  title="Edit role"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-xs"
                  onClick={() => toggleActive.mutate({ id: role.id, is_active: !role.is_active })}
                  disabled={toggleActive.isPending}
                  title={role.is_active ? "Deactivate role" : "Activate role"}
                >
                  {role.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => openPermPanel(role)}
                >
                  Permissions
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Role Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen} aria-describedby={undefined}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Create Role</DialogTitle>
            <DialogDescription>
              A role is a reusable set of permissions. Give it a clear name and a short code.
            </DialogDescription>
          </DialogHeader>
          <form id="create-role-form" onSubmit={handleCreateSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">Role Name *</Label>
              <Input
                id="role-name"
                {...regCreate("name", { required: "Required" })}
                placeholder="e.g. Invoice Approver"
                autoFocus
              />
              {errorsCreate.name && <p className="text-xs text-destructive">{errorsCreate.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-code">Code *</Label>
              <Input
                id="role-code"
                {...regCreate("code", { required: "Required" })}
                placeholder="e.g. inv_approver"
              />
              {errorsCreate.code ? (
                <p className="text-xs text-destructive">{errorsCreate.code.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Short unique identifier, no spaces.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-node-type">Valid at Unit Type</Label>
              <Select defaultValue="" onValueChange={(v) => setValueCreate("node_type_scope", v === "__all__" ? "" : v)}>
                <SelectTrigger id="role-node-type">
                  <SelectValue placeholder="All unit types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All unit types</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="entity">Entity</SelectItem>
                  <SelectItem value="region">Region</SelectItem>
                  <SelectItem value="branch">Branch</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave as "All" to allow this role at any unit type.
              </p>
            </div>
            {createError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createError}
              </p>
            )}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-role-form" disabled={createRole.isPending}>
              {createRole.isPending ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Creating…</>
              ) : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen} aria-describedby={undefined}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the name, code, or unit type scope for this role.
            </DialogDescription>
          </DialogHeader>
          <form id="edit-role-form" onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-name">Role Name *</Label>
              <Input
                id="edit-role-name"
                {...regEdit("name", { required: "Required" })}
                placeholder="e.g. Invoice Approver"
                autoFocus
              />
              {errorsEdit.name && <p className="text-xs text-destructive">{errorsEdit.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-code">Code *</Label>
              <Input
                id="edit-role-code"
                {...regEdit("code", { required: "Required" })}
                placeholder="e.g. inv_approver"
              />
              {errorsEdit.code ? (
                <p className="text-xs text-destructive">{errorsEdit.code.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Short unique identifier, no spaces.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-node-type">Valid at Unit Type</Label>
              <Select
                defaultValue={editRole?.node_type_scope ?? ""}
                onValueChange={(v) => setValueEdit("node_type_scope", v === "__all__" ? "" : v)}
              >
                <SelectTrigger id="edit-role-node-type">
                  <SelectValue placeholder="All unit types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All unit types</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="entity">Entity</SelectItem>
                  <SelectItem value="region">Region</SelectItem>
                  <SelectItem value="branch">Branch</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave as "All" to allow this role at any unit type.
              </p>
            </div>
            {editError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {editError}
              </p>
            )}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditRole(null); }}>
              Cancel
            </Button>
            <Button type="submit" form="edit-role-form" disabled={updateRole.isPending}>
              {updateRole.isPending ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…</>
              ) : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Permissions Panel (dialog) */}
      <Dialog open={permPanelOpen} onOpenChange={setPermPanelOpen} aria-describedby={undefined}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {selectedRole?.name ?? "Role"} — Permissions
            </DialogTitle>
            <DialogDescription>
              Grant or revoke permissions for this role. Changes apply immediately.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {rpLoading ? (
              <PageLoading />
            ) : (
              <div className="space-y-5 pb-2">
                {/* Currently granted */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Granted ({rolePerms.length})
                  </p>
                  {rolePerms.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No permissions granted yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {rolePerms.map((rp) => {
                        const resourceLabel = RESOURCE_LABELS[rp.permission_detail.resource] ?? rp.permission_detail.resource;
                        const actionLabel = ACTION_LABELS[rp.permission_detail.action] ?? rp.permission_detail.action;
                        return (
                          <div
                            key={rp.id}
                            className="flex items-center justify-between rounded-md border border-border bg-secondary/20 px-3 py-2"
                          >
                            <div>
                              <span className="text-sm font-medium">{actionLabel}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{resourceLabel}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => revokePermission.mutate(rp.id)}
                              disabled={revokePermission.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Available to grant */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Available to Grant
                  </p>
                  {Object.keys(groupedPerms).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No permissions available.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupedPerms).sort(([a], [b]) => a.localeCompare(b)).map(([resource, perms]) => {
                        const available = perms.filter((p) => !grantedIds.has(p.id));
                        if (available.length === 0) return null;
                        const resourceLabel = RESOURCE_LABELS[resource] ?? resource;
                        return (
                          <div key={resource}>
                            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{resourceLabel}</p>
                            <div className="space-y-1">
                              {available.map((p) => {
                                const actionLabel = ACTION_LABELS[p.action] ?? p.action;
                                return (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between rounded-md border border-dashed border-border bg-card px-3 py-2"
                                  >
                                    <span className="text-sm text-muted-foreground">{actionLabel}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs"
                                      onClick={() => {
                                        if (selectedRole) {
                                          grantPermission.mutate({
                                            role: selectedRole.id,
                                            permission: p.id,
                                          });
                                        }
                                      }}
                                      disabled={grantPermission.isPending}
                                    >
                                      Grant
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermPanelOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Unit Access Tab ────────────────────────────────────────────────────────────

function UnitAccessTab({ orgId }: { orgId: string | null }) {
  const { data: nodes = [] } = useScopeNodes(orgId ?? undefined);
  const { data: assignments = [], isLoading } = useUserScopeAssignments();
  const { data: allUsers = [] } = useUsers();

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-foreground">Unit Access</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Unit access determines where a user belongs or operates in the organization. Management of unit assignments is read-only for now.
        </p>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        <strong>Read-only.</strong> Unit access assignment management will be available in a future release.
      </div>

      {isLoading ? (
        <PageLoading />
      ) : assignments.length === 0 ? (
        <EmptyState message="No unit access records found." />
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => {
            const node = nodeMap.get(a.scope_node);
            const user = userMap.get(a.user);
            const userLabel = user ? getUserFullName(user) : `User ${a.user}`;
            const typeLabel =
              a.assignment_type === "PRIMARY" ? "Primary" :
              a.assignment_type === "ADDITIONAL" ? "Additional" :
              a.assignment_type === "DELEGATED" ? "Delegated" : a.assignment_type;

            return (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Network className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{userLabel}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {node ? node.name : a.scope_node}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {typeLabel} Unit
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Role Grants Tab ─────────────────────────────────────────────────────────────

function RoleGrantsTab({ orgId }: { orgId: string | null }) {
  const { data: roles = [], isLoading: rolesLoading } = useRoles(orgId ?? undefined);
  const { data: nodes = [] } = useScopeNodes(orgId ?? undefined);
  const { data: grants = [], isLoading: grantsLoading } = useUserRoleAssignments();
  const { data: allUsers = [] } = useUsers();
  const createGrant = useCreateUserRoleAssignment();
  const deleteGrant = useDeleteUserRoleAssignment();

  const roleMap = new Map(roles.map((r) => [r.id, r]));
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const [grantOpen, setGrantOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<CreateUserRoleAssignmentRequest>();

  const onGrantSubmit = async (data: CreateUserRoleAssignmentRequest) => {
    if (!selectedUserId) {
      setFormError("Please select a user.");
      return;
    }
    setFormError(null);
    try {
      await createGrant.mutateAsync({ ...data, user: selectedUserId });
      setGrantOpen(false);
      reset();
      setSelectedUserId("");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to grant role.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Role Grants</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Role grants determine what a user can do within a specific unit. Select a user, choose a role, and specify the unit.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={!orgId || roles.length === 0}
          onClick={() => setGrantOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Grant Role
        </Button>
      </div>

      {!orgId && (
        <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
          Select an organization to manage role grants.
        </div>
      )}

      {grantsLoading ? (
        <PageLoading />
      ) : grants.length === 0 ? (
        <EmptyState message="No role grants yet. Grant a role to a user to get started." />
      ) : (
        <div className="space-y-2">
          {grants.map((grant) => {
            const role = roleMap.get(grant.role);
            const node = nodeMap.get(grant.scope_node);
            const user = userMap.get(grant.user);
            const userLabel = user ? getUserFullName(user) : `User ${grant.user}`;
            return (
              <div
                key={grant.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{userLabel}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {role ? role.name : grant.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">at</span>
                      <Badge variant="secondary" className="text-xs">
                        {node ? node.name : grant.scope_node}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteGrant.mutate(grant.id)}
                  disabled={deleteGrant.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Grant Role Dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen} aria-describedby={undefined}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Grant Role</DialogTitle>
            <DialogDescription>
              Assign a role to a user at a specific unit. The user will gain the permissions defined in that role within that unit.
            </DialogDescription>
          </DialogHeader>
          <form id="grant-role-form" onSubmit={handleSubmit(onGrantSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>User *</Label>
              <UserPicker
                value={selectedUserId || null}
                onChange={(id) => {
                  setSelectedUserId(id);
                  setValue("user", id, { shouldValidate: true });
                }}
                placeholder="Search for a user…"
              />
              {formError && !selectedUserId && (
                <p className="text-xs text-destructive">{formError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select onValueChange={(v) => setValue("role", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role…" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit *</Label>
                <Select onValueChange={(v) => setValue("scope_node", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit…" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantOpen(false)}>Cancel</Button>
            <Button type="submit" form="grant-role-form" disabled={createGrant.isPending}>
              {createGrant.isPending ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Granting…</>
              ) : "Grant Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const AccessControlPage = () => {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { data: nodes = [] } = useScopeNodes(selectedOrgId ?? undefined);

  useEffect(() => {
    if (!selectedOrgId && organizations.length === 1 && organizations[0]) {
      setSelectedOrgId(organizations[0].id);
    }
  }, [selectedOrgId, organizations]);

  return (
    <V2Shell
      title="Access Management"
      titleIcon={<Shield className="h-5 w-5 text-muted-foreground" />}
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
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      }
    >
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="mb-5">
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="unit-access">Unit Access</TabsTrigger>
            <TabsTrigger value="role-grants">Role Grants</TabsTrigger>
            <TabsTrigger value="permissions">Permission Catalog</TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <RolesTab orgId={selectedOrgId} nodes={nodes} />
          </TabsContent>

          <TabsContent value="unit-access">
            <UnitAccessTab orgId={selectedOrgId} />
          </TabsContent>

          <TabsContent value="role-grants">
            <RoleGrantsTab orgId={selectedOrgId} />
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionCatalog />
          </TabsContent>
        </Tabs>
      </div>
    </V2Shell>
  );
};

export default AccessControlPage;