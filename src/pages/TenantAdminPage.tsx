import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { canManageIAM } from "@/lib/capabilities";
import { useOrganizations } from "@/lib/hooks/useOrganizations";
import {
  useLegalEntitiesAdmin,
  useCreateLegalEntity,
  useUpdateLegalEntity,
  useOrgUnitTypes,
  useCreateOrgUnitType,
  useUpdateOrgUnitType,
  useOrgUnitsAdmin,
  useOrgUnitTree,
  useCreateOrgUnit,
  useUpdateOrgUnit,
  useTenantUsers,
  useCreateTenantUser,
  useUpdateTenantUser,
  useOrgAssignments,
  useCreateOrgAssignment,
  useDeleteOrgAssignment,
  useRoleAssignments,
  useCreateRoleAssignment,
  useDeleteRoleAssignment,
  useRoles,
} from "@/lib/hooks/useTenantAdmin";
import type {
  LegalEntity,
  OrgUnit,
  OrgUnitTreeNode,
  OrgUnitType,
  TenantUser,
  UserOrgAssignment,
  UserRoleAssignment,
} from "@/lib/api/tenantAdmin";
import {
  Building2,
  Users,
  ShieldCheck,
  Layers,
  GitBranch,
  Network,
  UserCheck,
  Key,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Loader2,
  Activity,
  Info,
  Building,
  NetworkIcon,
  UserCircle,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section =
  | "organization"
  | "legal-structure"
  | "operational-structure"
  | "users-access";

const TABS: { id: Section; label: string; icon: typeof Building2 }[] = [
  { id: "organization",          label: "Organization",       icon: Building },
  { id: "legal-structure",       label: "Legal Structure",    icon: Layers },
  { id: "operational-structure", label: "Operational Structure", icon: NetworkIcon },
  { id: "users-access",         label: "Users & Access",     icon: UserCircle },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "default" : "secondary"} className="text-xs">
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function SectionHeader({
  title,
  subtitle,
  onAdd,
}: {
  title: string;
  subtitle?: string;
  onAdd?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {onAdd && (
        <Button size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add
        </Button>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground text-sm">{message}</div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// ── Overview / Organization ────────────────────────────────────────────────────

function OrganizationSection() {
  const { data: orgs, isLoading } = useOrganizations();
  const { data: entities } = useLegalEntitiesAdmin();
  const { data: units } = useOrgUnitsAdmin();
  const { data: users } = useTenantUsers();

  if (isLoading) return <LoadingState />;
  if (!orgs?.length) return <EmptyState message="No organizations found." />;

  const org = orgs[0];
  const entityCount = entities?.length ?? 0;
  const unitCount = units?.length ?? 0;
  const userCount = users?.length ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Organization</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Top-level boundary for this tenant</p>
      </div>
      
      <div className="widget-card p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{org.name}</h3>
            {org.short_name && (
              <p className="text-sm text-muted-foreground">{org.short_name}</p>
            )}
          </div>
          <StatusBadge active={org.is_active} />
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Currency</p>
            <p className="font-medium">{org.primary_currency}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Timezone</p>
            <p className="font-medium">{org.timezone}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">FY Start</p>
            <p className="font-medium">Month {org.fiscal_year_start_month}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Status</p>
            <p className="font-medium">{org.is_active ? "Active" : "Inactive"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="widget-card p-4 text-center">
          <p className="text-2xl font-semibold text-foreground">{entityCount}</p>
          <p className="text-xs text-muted-foreground">Legal Entities</p>
        </div>
        <div className="widget-card p-4 text-center">
          <p className="text-2xl font-semibold text-foreground">{unitCount}</p>
          <p className="text-xs text-muted-foreground">Org Units</p>
        </div>
        <div className="widget-card p-4 text-center">
          <p className="text-2xl font-semibold text-foreground">{userCount}</p>
          <p className="text-xs text-muted-foreground">Users</p>
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 text-sm">
        <div className="flex gap-2 mb-2">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-muted-foreground font-medium">About this structure</p>
        </div>
        <ul className="space-y-1 text-muted-foreground ml-6 list-disc">
          <li><strong className="text-foreground">Organization</strong> — top boundary for this tenant</li>
          <li><strong className="text-foreground">Legal Entity</strong> — company/legal shell under the organization</li>
          <li><strong className="text-foreground">Org Unit</strong> — operational node in the hierarchy</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-3">
          The organization is bootstrapped by system admin. Tenant admins manage the structure underneath it.
        </p>
      </div>
    </div>
  );
}

// ── Legal Structure ────────────────────────────────────────────────────────────

function LegalStructureSection() {
  const { data: orgs } = useOrganizations();
  const [orgFilter, setOrgFilter] = useState<string | undefined>(undefined);
  const { data: entities, isLoading } = useLegalEntitiesAdmin(orgFilter);
  const createMutation = useCreateLegalEntity();
  const updateMutation = useUpdateLegalEntity();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LegalEntity | null>(null);
  const [form, setForm] = useState({
    organization: "", name: "", short_name: "", registration_number: "",
    tax_id: "", country: "", currency: "INR", is_active: true,
  });

  function openAdd() {
    setEditing(null);
    setForm({ organization: orgs?.[0]?.id ?? "", name: "", short_name: "", registration_number: "", tax_id: "", country: "IN", currency: "INR", is_active: true });
    setDialogOpen(true);
  }

  function openEdit(e: LegalEntity) {
    setEditing(e);
    setForm({ organization: e.organization_id, name: e.name, short_name: e.short_name, registration_number: e.registration_number, tax_id: e.tax_id, country: e.country, currency: e.currency, is_active: e.is_active });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: form });
    } else {
      await createMutation.mutateAsync(form);
    }
    setDialogOpen(false);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Legal Structure</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Companies / legal entities under the organization</p>
      </div>
      
      <div className="bg-muted/30 rounded-lg p-3 text-sm mb-4">
        <p className="text-muted-foreground">
          Legal entities represent companies or accounting/legal shells. Invoices, budgets, and reporting may be filtered by legal entity.
        </p>
      </div>

      {orgs && orgs.length > 1 && (
        <div className="mb-4">
          <Select value={orgFilter ?? "all"} onValueChange={(v) => setOrgFilter(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All organizations</SelectItem>
              {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? <LoadingState /> : (
        <div className="widget-card overflow-hidden">
          {!entities?.length ? <EmptyState message="No legal entities found." /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium">Company / Name</th>
                  <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">Country</th>
                  <th className="text-left p-3 text-muted-foreground font-medium hidden md:table-cell">Currency</th>
                  <th className="text-left p-3 text-muted-foreground font-medium hidden lg:table-cell">Tax ID</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {entities.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <p className="font-medium text-foreground">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.organization_name}</p>
                    </td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{e.country}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{e.currency}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{e.tax_id || "—"}</td>
                    <td className="p-3"><StatusBadge active={e.is_active} /></td>
                    <td className="p-3">
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(e)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Legal Entity" : "Add Legal Entity"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Organization</Label>
              <Select value={form.organization} onValueChange={(v) => setForm({ ...form, organization: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {orgs?.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Short Name</Label>
                <Input value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Country</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div>
                <Label>Tax ID</Label>
                <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Registration Number</Label>
              <Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="le-active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
              <Label htmlFor="le-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Org Unit Types (Supporting) ───────────────────────────────────────────────

function OrgUnitTypesSection() {
  const { data: types, isLoading } = useOrgUnitTypes();
  const createMutation = useCreateOrgUnitType();
  const updateMutation = useUpdateOrgUnitType();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OrgUnitType | null>(null);
  const [form, setForm] = useState({ code: "", name: "", level: 1, is_active: true });

  function openAdd() {
    setEditing(null);
    setForm({ code: "", name: "", level: 1, is_active: true });
    setDialogOpen(true);
  }

  function openEdit(t: OrgUnitType) {
    setEditing(t);
    setForm({ code: t.code, name: t.name, level: t.level, is_active: t.is_active });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: form });
    } else {
      await createMutation.mutateAsync(form);
    }
    setDialogOpen(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Unit Types</h3>
        <Button variant="ghost" size="sm" onClick={openAdd}>
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      </div>
      {isLoading ? <LoadingState /> : (
        <div className="rounded-md border divide-y">
          {!types?.length ? <EmptyState message="No unit types defined." /> : (
            <div className="max-h-48 overflow-y-auto">
              {types.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground w-16">{t.code}</span>
                    <span className="text-sm">{t.name}</span>
                    <Badge variant="secondary" className="text-xs">Level {t.level}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => openEdit(t)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Unit Type" : "Add Unit Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. division" />
              </div>
              <div>
                <Label>Level</Label>
                <Input type="number" value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} min={1} />
              </div>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Division" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ut-active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
              <Label htmlFor="ut-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Org Units (Supporting) ────────────────────────────────────────────────────────────

function OrgUnitsSection() {
  const { data: orgs } = useOrganizations();
  const { data: types } = useOrgUnitTypes();
  const [orgFilter, setOrgFilter] = useState<string | undefined>(undefined);
  const { data: units, isLoading } = useOrgUnitsAdmin(orgFilter);
  const createMutation = useCreateOrgUnit();
  const updateMutation = useUpdateOrgUnit();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OrgUnit | null>(null);
  const [form, setForm] = useState({
    organization: "", legal_entity: "", unit_type: "", parent: "",
    code: "", name: "", sort_order: 0, is_active: true,
  });

  function openAdd() {
    setEditing(null);
    setForm({ organization: orgs?.[0]?.id ?? "", legal_entity: "", unit_type: types?.[0]?.id ?? "", parent: "", code: "", name: "", sort_order: 0, is_active: true });
    setDialogOpen(true);
  }

  function openEdit(u: OrgUnit) {
    setEditing(u);
    setForm({ organization: u.organization_id, legal_entity: u.legal_entity_id ?? "", unit_type: u.unit_type.id, parent: u.parent_id ?? "", code: u.code, name: u.name, sort_order: u.sort_order, is_active: u.is_active });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = {
      organization: form.organization,
      legal_entity: form.legal_entity || null,
      unit_type: form.unit_type,
      parent: form.parent || null,
      code: form.code,
      name: form.name,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setDialogOpen(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Org Units List</h3>
        <Button variant="ghost" size="sm" onClick={openAdd}>
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      </div>

      {orgs && orgs.length > 1 && (
        <div className="mb-4">
          <Select value={orgFilter ?? "all"} onValueChange={(v) => setOrgFilter(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-56"><SelectValue placeholder="All organizations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All organizations</SelectItem>
              {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? <LoadingState /> : (
        <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
          {!units?.length ? <EmptyState message="No org units found." /> : (
            units.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
                <div className="flex items-center gap-3" style={{ paddingLeft: `${u.depth * 12}px` }}>
                  <span className="font-mono text-xs text-muted-foreground w-20">{u.code}</span>
                  <span className="text-sm">{u.name}</span>
                  <Badge variant="outline" className="text-xs">{u.unit_type.name}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => openEdit(u)}>
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Org Unit" : "Add Org Unit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Organization</Label>
                <Select value={form.organization} onValueChange={(v) => setForm({ ...form, organization: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{orgs?.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit Type</Label>
                <Select value={form.unit_type} onValueChange={(v) => setForm({ ...form, unit_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{types?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Parent (optional)</Label>
              <Select value={form.parent || "none"} onValueChange={(v) => setForm({ ...form, parent: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="No parent (root)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (root)</SelectItem>
                  {units?.filter(u => u.id !== editing?.id).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ou-active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
              <Label htmlFor="ou-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Operational Structure: Strong Tree ────────────────────────────────────────

interface TreeNodeComponentProps {
  node: OrgUnitTreeNode;
  depth?: number;
  onSelect: (node: OrgUnitTreeNode) => void;
  selectedId?: string;
}

function TreeNodeComponent({ node, depth = 0, onSelect, selectedId }: TreeNodeComponentProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1.5 px-2 rounded-lg transition-colors cursor-pointer group ${
          isSelected ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/40"
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </button>
        ) : (
          <Circle className="w-2 h-2 text-muted-foreground flex-shrink-0 ml-1" />
        )}
        <span className="text-xs font-mono text-muted-foreground w-20 flex-shrink-0">{node.code}</span>
        <span className={`text-sm flex-1 truncate ${isSelected ? "font-medium text-foreground" : "text-foreground"}`}>
          {node.name}
        </span>
        {node.legal_entity_name && (
          <span className="text-xs text-muted-foreground mr-1">
            <span className="font-medium">LE:</span> {node.legal_entity_name}
          </span>
        )}
        <Badge variant={node.is_active ? "default" : "secondary"} className="text-xs mr-1">
          {node.unit_type.name}
        </Badge>
        {!node.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
      </div>
      {expanded && node.children.map((child) => (
        <TreeNodeComponent
          key={child.id}
          node={child as OrgUnitTreeNode}
          depth={depth + 1}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}

function OperationalStructureSection() {
  const { data: orgs } = useOrganizations();
  const [orgFilter, setOrgFilter] = useState<string | undefined>(undefined);
  const { data: tree, isLoading } = useOrgUnitTree(orgFilter);
  const [selectedNode, setSelectedNode] = useState<OrgUnitTreeNode | null>(null);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Operational Structure</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Organization hierarchy and operational nodes</p>
      </div>

      <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground mb-4">
        <span className="font-medium">Legend:</span> LE = Legal Entity (company). Org units define operational hierarchy. Legal Entity shows which company the branch belongs to.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tree Panel */}
        <div className="lg:col-span-2">
          <div className="widget-card p-4">
            {orgs && orgs.length > 1 && (
              <div className="mb-4">
                <Select value={orgFilter ?? "all"} onValueChange={(v) => setOrgFilter(v === "all" ? undefined : v)}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="All organizations" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All organizations</SelectItem>
                    {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isLoading ? <LoadingState /> : (
              <div className="max-h-[400px] overflow-y-auto">
                {!tree?.length ? <EmptyState message="No org units found." /> : (
                  <div className="pr-2">
                    {tree.map((node) => (
                      <TreeNodeComponent
                        key={node.id}
                        node={node as OrgUnitTreeNode}
                        onSelect={setSelectedNode}
                        selectedId={selectedNode?.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div>
          <div className="widget-card p-4 h-full">
            <h3 className="text-sm font-medium text-foreground mb-3">Selected Node</h3>
            {selectedNode ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Name</p>
                  <p className="font-medium">{selectedNode.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Code</p>
                  <p className="font-mono text-sm">{selectedNode.code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Type</p>
                  <p className="text-sm">{selectedNode.unit_type.name}</p>
                </div>
                {selectedNode.legal_entity_name && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Legal Entity</p>
                    <Badge variant="outline" className="bg-background">{selectedNode.legal_entity_name}</Badge>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                  <Badge variant={selectedNode.is_active ? "default" : "secondary"}>
                    {selectedNode.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Children: {selectedNode.children.length}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a node from the tree to view details.</p>
            )}
          </div>
        </div>
      </div>

      {/* Supporting Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <OrgUnitTypesSection />
        <OrgUnitsSection />
      </div>
    </div>
  );
}

// ── Users (Part of Users & Access) ─────────────────────────────────────

function UsersSection() {
  const { data: users, isLoading } = useTenantUsers();
  const { data: units } = useOrgUnitsAdmin();
  const createMutation = useCreateTenantUser();
  const updateMutation = useUpdateTenantUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TenantUser | null>(null);
  const [form, setForm] = useState({
    email: "", org_unit: "",
    first_name: "", last_name: "", employee_id: "", phone: "", is_active: false,
  });

  function openAdd() {
    setEditing(null);
    setForm({ email: "", org_unit: units?.[0]?.id ?? "", first_name: "", last_name: "", employee_id: "", phone: "", is_active: false });
    setDialogOpen(true);
  }

  function openEdit(u: TenantUser) {
    setEditing(u);
    setForm({ email: u.email, org_unit: "", first_name: u.first_name, last_name: u.last_name, employee_id: u.employee_id, phone: u.phone, is_active: u.is_active });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (editing) {
      const { email: _email, org_unit: _ou, ...updateFields } = form;
      await updateMutation.mutateAsync({ id: editing.id, data: updateFields });
    } else {
      await createMutation.mutateAsync({ ...form });
    }
    setDialogOpen(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Users</h3>
        <Button variant="ghost" size="sm" onClick={openAdd}>
          <Plus className="w-3 h-3 mr-1" /> Add User
        </Button>
      </div>
      {isLoading ? <LoadingState /> : (
        <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
          {!users?.length ? <EmptyState message="No users found." /> : (
            users.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge active={u.is_active} />
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => openEdit(u)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {!editing && (
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            )}
            {!editing && (
              <div>
                <Label>Org Unit <span className="text-destructive">*</span></Label>
                <Select value={form.org_unit} onValueChange={(v) => setForm({ ...form, org_unit: v })}>
                  <SelectTrigger><SelectValue placeholder="Select org unit to place user in" /></SelectTrigger>
                  <SelectContent>{units?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">User will be placed in this org unit immediately on creation.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Employee ID</Label>
                <Input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="u-active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded"
                disabled={!editing}
              />
              <Label htmlFor="u-active" className={!editing ? "text-muted-foreground" : ""}>
                {!editing ? "Active (use Send Access Email to activate)" : "Active"}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Org Assignments (Part of Users & Access) ───────────────────────────────────────

function OrgAssignmentsSection() {
  const { data: users } = useTenantUsers();
  const { data: units } = useOrgUnitsAdmin();
  const [userFilter, setUserFilter] = useState<string | undefined>(undefined);
  const { data: assignments, isLoading } = useOrgAssignments(userFilter);
  const createMutation = useCreateOrgAssignment();
  const deleteMutation = useDeleteOrgAssignment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ user: "", org_unit: "", is_primary: false, valid_from: "", valid_until: "" });

  async function handleSave() {
    await createMutation.mutateAsync({
      user: form.user,
      org_unit: form.org_unit,
      is_primary: form.is_primary,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
    });
    setDialogOpen(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Org Assignments (Home/Base)</h3>
        <Button variant="ghost" size="sm" onClick={() => { setForm({ user: "", org_unit: "", is_primary: false, valid_from: "", valid_until: "" }); setDialogOpen(true); }}>
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      </div>

      <div className="mb-4">
        <Select value={userFilter ?? "all"} onValueChange={(v) => setUserFilter(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="All users" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <LoadingState /> : (
        <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
          {!assignments?.length ? <EmptyState message="No org assignments found." /> : (
            assignments.map((a: UserOrgAssignment) => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{a.user_email}</p>
                  <p className="text-xs text-muted-foreground">{a.org_unit_name} {a.is_primary && "(primary)"}</p>
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(a.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Org Assignment</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>User</Label>
              <Select value={form.user} onValueChange={(v) => setForm({ ...form, user: v })}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>{users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Org Unit (Home/Base)</Label>
              <Select value={form.org_unit} onValueChange={(v) => setForm({ ...form, org_unit: v })}>
                <SelectTrigger><SelectValue placeholder="Select org unit" /></SelectTrigger>
                <SelectContent>{units?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valid From</Label>
                <Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="oa-primary" checked={form.is_primary} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} className="rounded" />
              <Label htmlFor="oa-primary">Primary assignment (home/base)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Role Assignments (Part of Users & Access) ───────────────────────────────────

function RoleAssignmentsSection() {
  const { data: users } = useTenantUsers();
  const { data: roles } = useRoles();
  const { data: units } = useOrgUnitsAdmin();
  const [userFilter, setUserFilter] = useState<string | undefined>(undefined);
  const { data: assignments, isLoading } = useRoleAssignments(userFilter);
  const createMutation = useCreateRoleAssignment();
  const deleteMutation = useDeleteRoleAssignment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ user: "", role: "", org_unit: "", valid_from: "", valid_until: "" });

  async function handleSave() {
    await createMutation.mutateAsync({
      user: form.user,
      role: form.role,
      org_unit: form.org_unit || null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
    });
    setDialogOpen(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Role Assignments</h3>
        <Button variant="ghost" size="sm" onClick={() => { setForm({ user: "", role: "", org_unit: "", valid_from: "", valid_until: "" }); setDialogOpen(true); }}>
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      </div>

      <div className="mb-4">
        <Select value={userFilter ?? "all"} onValueChange={(v) => setUserFilter(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="All users" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <LoadingState /> : (
        <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
          {!assignments?.length ? <EmptyState message="No role assignments found." /> : (
            assignments.map((a: UserRoleAssignment) => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{a.user_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.role_name} → {a.org_unit_name || <span className="text-primary font-medium">(org-wide)</span>}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(a.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Role Assignment</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>User</Label>
              <Select value={form.user} onValueChange={(v) => setForm({ ...form, user: v })}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>{users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{roles?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scope (leave blank for org-wide)</Label>
              <Select value={form.org_unit || "none"} onValueChange={(v) => setForm({ ...form, org_unit: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Org-wide" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Org-wide (all org units)</SelectItem>
                  {units?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valid From</Label>
                <Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Users & Access Section (Combined) ─────────────────────────────────────────

function UsersAccessSection() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Users & Access</h2>
        <p className="text-sm text-muted-foreground mt-0.5">People and their authority in the organization</p>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 mb-6">
        <div className="flex gap-2 mb-2">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-muted-foreground font-medium text-sm">Understanding access</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm ml-6">
          <div>
            <p className="text-foreground font-medium">Org Assignment = User's placement</p>
            <p className="text-muted-foreground text-xs">User's home/base org unit in the structure</p>
          </div>
          <div>
            <p className="text-foreground font-medium">Role Assignment = Authority</p>
            <p className="text-muted-foreground text-xs">What the user can do</p>
          </div>
          <div>
            <p className="text-foreground font-medium">Role scoped to org unit</p>
            <p className="text-muted-foreground text-xs">Restricted to that branch</p>
          </div>
          <div>
            <p className="text-foreground font-medium">Blank role scope</p>
            <p className="text-muted-foreground text-xs">Org-wide (across all org units)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UsersSection />
        <div className="space-y-6">
          <OrgAssignmentsSection />
          <RoleAssignmentsSection />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TenantAdminPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>("organization");

  if (!canManageIAM(user)) {
    return (
      <AppLayout title="Tenant Admin" subtitle="Organization configuration">
        <div className="widget-card text-center py-12">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">You need the <code>iam.manage</code> capability to access this page.</p>
        </div>
      </AppLayout>
    );
  }

  function renderSection() {
    switch (activeSection) {
      case "organization":           return <OrganizationSection />;
      case "legal-structure":         return <LegalStructureSection />;
      case "operational-structure":   return <OperationalStructureSection />;
      case "users-access":          return <UsersAccessSection />;
    }
  }

  return (
    <AppLayout title="Tenant Admin" subtitle="Organization, hierarchy, users and access">
      {/* Horizontal tab bar — same pattern as /settings */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      <motion.div key={activeSection} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {renderSection()}
      </motion.div>
    </AppLayout>
  );
}
