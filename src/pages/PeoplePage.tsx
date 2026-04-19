import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { V2Shell } from "@/components/v2/V2Shell";
import { useUsers, useCreateUser, useUpdateUser } from "@/lib/hooks/useV2Users";
import { getUserFullName, type V2User, type CreateUserRequest, type UpdateUserRequest } from "@/lib/types/v2user";
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
}

function AddPersonDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createUser = useCreateUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPersonForm>({
    defaultValues: { first_name: "", last_name: "", email: "", employee_id: "" },
  });

  function onSubmit(data: AddPersonForm) {
    const payload: CreateUserRequest = {
      email: data.email,
      first_name: data.first_name || undefined,
      last_name: data.last_name || undefined,
      employee_id: data.employee_id || undefined,
    };
    createUser.mutate(payload, {
      onSuccess: () => {
        toast.success("Person added successfully.");
        reset();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to add person.");
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }} aria-describedby={undefined}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Add Person</DialogTitle>
          <DialogDescription>
            Create a new person account. They can be assigned access roles separately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
              Add Person
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
          <div className="grid grid-cols-2 gap-3">
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

// ── Person Detail Panel ────────────────────────────────────────────────────────

function PersonDetailPanel({
  person,
  onClose,
  onEdit,
  onToggleActive,
  togglingActive,
}: {
  person: V2User;
  onClose: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  togglingActive: boolean;
}) {
  const navigate = useNavigate();

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
          <div className="grid grid-cols-2 gap-3">
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

          {/* Employee ID */}
          {person.employee_id && (
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="mb-1 flex items-center gap-1">
                <p className="text-xs text-muted-foreground">Employee ID</p>
              </div>
              <p className="text-sm font-medium">{person.employee_id}</p>
            </div>
          )}

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
                disabled={togglingActive}
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
              onClick={() => navigate("/access-control")}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Manage Access
              <ArrowRight className="ml-auto h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </ScrollArea>
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

  const params = search.length >= 1
    ? { q: search, ...(statusFilter !== "all" ? { is_active: statusFilter === "active" } : {}) }
    : statusFilter !== "all"
    ? { is_active: statusFilter === "active" }
    : undefined;

  const { data: people = [], isLoading, error } = useUsers(params);
  const updateUser = useUpdateUser();

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

  return (
    <V2Shell
      title="Users"
      titleIcon={<Users className="h-5 w-5 text-muted-foreground" />}
      actions={
        <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Person
        </Button>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Left panel: search + list */}
        <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-border bg-background xl:w-96">
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
                    Add Person
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
              togglingActive={updateUser.isPending}
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
