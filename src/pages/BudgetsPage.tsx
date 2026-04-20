import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { V2Shell } from "@/components/v2/V2Shell";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  useOrganizations,
  useScopeNodes,
} from "@/lib/hooks/useScopeNodes";
import {
  useCategories,
  useSubCategories,
  useBudgets,
  useRules,
  useConsumptions,
  useVarianceRequests,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateSubCategory,
  useUpdateSubCategory,
  useDeleteSubCategory,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
  useReviewVarianceRequest,
  useBudgetOverview,
} from "@/lib/hooks/useV2Budget";
import type {
  BudgetCategory,
  BudgetSubCategory,
  Budget,
  BudgetRule,
  BudgetConsumption,
  BudgetVarianceRequest,
  BudgetStatus,
  PeriodType,
  VarianceStatus,
  ConsumptionType,
  SourceType,
  CreateCategoryRequest,
  CreateSubCategoryRequest,
  CreateBudgetRequest,
  CreateRuleRequest,
} from "@/lib/types/v2budget";
import {
  BUDGET_STATUS_LABELS,
  PERIOD_TYPE_LABELS,
  VARIANCE_STATUS_LABELS,
  CONSUMPTION_TYPE_LABELS,
  CONSUMPTION_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
} from "@/lib/types/v2budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Wallet,
  FolderOpen,
  Folder,
  GitBranch,
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCcw,
  LayoutDashboard,
  List,
  BarChart3,
  ChevronDown,
  ChevronRight,
  MapPin,
  TrendingUp,
  DollarSign,
  Target,
  Bookmark,
} from "lucide-react";

// ── Status Badges ─────────────────────────────────────────────────────────────

const BUDGET_STATUS_COLORS: Record<BudgetStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  exhausted: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  frozen: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  return (
    <Badge className={BUDGET_STATUS_COLORS[status] ?? ""} variant="outline">
      {BUDGET_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function VarianceStatusBadge({ status }: { status: VarianceStatus }) {
  const colors: Record<VarianceStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };
  return (
    <Badge className={colors[status] ?? ""} variant="outline">
      {VARIANCE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function ConsumptionTypeBadge({ ct }: { ct: ConsumptionType }) {
  const colors: Record<ConsumptionType, string> = {
    reserved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    consumed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    released: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    adjusted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };
  return (
    <Badge className={colors[ct] ?? ""} variant="outline">
      {CONSUMPTION_TYPE_LABELS[ct] ?? ct}
    </Badge>
  );
}

// ── Loading / Empty helpers ────────────────────────────────────────────────────

function PageLoading() {
  return (
    <div className="flex h-32 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyState({ message, icon: Icon }: { message: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
      <Icon className="mb-2 h-8 w-8 opacity-30" />
      <p>{message}</p>
    </div>
  );
}

// ── Form Field Error ──────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

// ── Create Category Dialog ──────────────────────────────────────────────────────

function CreateCategoryDialog({
  orgId,
  onSuccess,
}: {
  orgId: string | null;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryRequest & { org_id: string }>();

  const onSubmit = async (data: Record<string, string>) => {
    try {
      await create.mutateAsync({ org: data.org_id, name: data.name, code: data.code });
      setOpen(false);
      reset();
      onSuccess?.();
    } catch { /* error via create.error */ }
  };

  const submitError =
    create.isError && create.error instanceof ApiError
      ? create.error.message
      : create.isError
      ? "Failed to create category"
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5" disabled={!orgId}>
          <Plus className="h-4 w-4" />
          New Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
        </DialogHeader>
        <form id="create-cat-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("org_id")} value={orgId ?? ""} />
          <p className="text-xs text-muted-foreground py-1">
            Creating under org: <strong>{orgId ?? "none selected"}</strong>
          </p>
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              {...register("name", { required: "Required" })}
              placeholder="e.g. Marketing"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <FieldError message={errors.name.message} />}
          </div>
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input
              {...register("code", { required: "Required" })}
              placeholder="e.g. MKT"
              className={errors.code ? "border-destructive" : ""}
            />
            {errors.code && <FieldError message={errors.code.message} />}
          </div>
          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            type="submit"
            form="create-cat-form"
            disabled={isSubmitting || create.isPending}
          >
            {create.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Creating...</> : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Category Dialog ──────────────────────────────────────────────────────

function EditCategoryDialog({
  category,
  onSuccess,
}: {
  category: BudgetCategory;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string; code: string; is_active: boolean }>({
    defaultValues: {
      name: category.name,
      code: category.code,
      is_active: category.is_active,
    },
  });

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      await update.mutateAsync({ id: category.id, data: data as { name?: string; code?: string; is_active?: boolean } });
      setOpen(false);
      onSuccess?.();
    } catch { /* error via update.error */ }
  };

  const submitError =
    update.isError && update.error instanceof ApiError
      ? update.error.message
      : update.isError
      ? "Failed to update category"
      : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>
        <form id="edit-cat-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input {...register("name", { required: "Required" })} className={errors.name ? "border-destructive" : ""} />
            {errors.name && <FieldError message={errors.name.message} />}
          </div>
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input {...register("code", { required: "Required" })} className={errors.code ? "border-destructive" : ""} />
            {errors.code && <FieldError message={errors.code.message} />}
          </div>
          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            type="submit"
            form="edit-cat-form"
            disabled={isSubmitting || update.isPending}
          >
            {update.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Category Dialog ────────────────────────────────────────────────────

function DeleteCategoryDialog({
  category,
  onSuccess,
}: {
  category: BudgetCategory;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const del = useDeleteCategory();

  const handleDelete = async () => {
    try {
      await del.mutateAsync(category.id);
      setOpen(false);
      onSuccess?.();
    } catch { /* error via del.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Category</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{category.name}</strong>? This may fail if the category has associated subcategories or budgets.
        </p>
        {del.isError && del.error instanceof ApiError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {del.error.message}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
            {del.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create SubCategory Dialog ──────────────────────────────────────────────────

function CreateSubCategoryDialog({
  categoryId,
  onSuccess,
}: {
  categoryId: string | null;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateSubCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSubCategoryRequest & { category_id: string }>();

  const onSubmit = async (data: Record<string, string>) => {
    try {
      await create.mutateAsync({ category: data.category_id, name: data.name, code: data.code });
      setOpen(false);
      reset();
      onSuccess?.();
    } catch { /* error via create.error */ }
  };

  const submitError =
    create.isError && create.error instanceof ApiError
      ? create.error.message
      : create.isError
      ? "Failed to create subcategory"
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5" disabled={!categoryId}>
          <Plus className="h-4 w-4" />
          New Subcategory
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Subcategory</DialogTitle>
        </DialogHeader>
        <form id="create-subcat-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("category_id")} value={categoryId ?? ""} />
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input {...register("name", { required: "Required" })} placeholder="e.g. Digital Ads" className={errors.name ? "border-destructive" : ""} />
            {errors.name && <FieldError message={errors.name.message} />}
          </div>
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input {...register("code", { required: "Required" })} placeholder="e.g. DIG" className={errors.code ? "border-destructive" : ""} />
            {errors.code && <FieldError message={errors.code.message} />}
          </div>
          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="create-subcat-form" disabled={isSubmitting || create.isPending}>
            {create.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Creating...</> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit SubCategory Dialog ───────────────────────────────────────────────────

function EditSubCategoryDialog({
  subcategory,
  onSuccess,
}: {
  subcategory: BudgetSubCategory;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateSubCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string; code: string }>({
    defaultValues: { name: subcategory.name, code: subcategory.code },
  });

  const onSubmit = async (data: Record<string, string>) => {
    try {
      await update.mutateAsync({ id: subcategory.id, data });
      setOpen(false);
      onSuccess?.();
    } catch { /* error via update.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Subcategory</DialogTitle>
        </DialogHeader>
        <form id="edit-subcat-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input {...register("name", { required: "Required" })} className={errors.name ? "border-destructive" : ""} />
            {errors.name && <FieldError message={errors.name.message} />}
          </div>
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input {...register("code", { required: "Required" })} className={errors.code ? "border-destructive" : ""} />
            {errors.code && <FieldError message={errors.code.message} />}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="edit-subcat-form" disabled={isSubmitting || update.isPending}>
            {update.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete SubCategory Dialog ─────────────────────────────────────────────────

function DeleteSubCategoryDialog({
  subcategory,
  onSuccess,
}: {
  subcategory: BudgetSubCategory;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const del = useDeleteSubCategory();

  const handleDelete = async () => {
    try {
      await del.mutateAsync(subcategory.id);
      setOpen(false);
      onSuccess?.();
    } catch { /* error via del.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Subcategory</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{subcategory.name}</strong>?
        </p>
        {del.isError && del.error instanceof ApiError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {del.error.message}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
            {del.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Budget Dialog ──────────────────────────────────────────────────────

function CreateBudgetDialog({
  orgId,
  scopeNodeId,
  onSuccess,
}: {
  orgId: string | null;
  scopeNodeId: string | null;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateBudget();

  const { data: categories = [] } = useCategories(orgId ? { org: orgId } : undefined);
  const { data: subcategories = [] } = useSubCategories();
  const { data: nodes = [] } = useScopeNodes(orgId ?? undefined);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateBudgetRequest & { scope_node_id: string; category_id: string; subcategory_id: string }>();

  const selectedCategoryId = watch("category_id");

  const onSubmit = async (data: Record<string, string>) => {
    try {
      await create.mutateAsync({
        scope_node: data.scope_node_id,
        category: data.category_id,
        subcategory: data.subcategory_id || undefined,
        financial_year: data.financial_year,
        period_type: (data.period_type || "yearly") as PeriodType,
        allocated_amount: data.allocated_amount,
        currency: data.currency || "INR",
      });
      setOpen(false);
      reset();
      onSuccess?.();
    } catch { /* error via create.error */ }
  };

  const submitError =
    create.isError && create.error instanceof ApiError
      ? create.error.message
      : create.isError
      ? "Failed to create budget"
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Budget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Budget</DialogTitle>
        </DialogHeader>
        <form id="create-budget-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Scope Node *</Label>
            <Select onValueChange={(v) => setValue("scope_node_id", v)} defaultValue="">
              <SelectTrigger><SelectValue placeholder="Select scope node..." /></SelectTrigger>
              <SelectContent>
                {nodes.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.name} ({n.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.scope_node && <FieldError message="Required" />}
          </div>

          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select onValueChange={(v) => { setValue("category_id", v); setValue("subcategory_id", ""); }}>
              <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <FieldError message="Required" />}
          </div>

          {selectedCategoryId && (
            <div className="space-y-1.5">
              <Label>Subcategory</Label>
              <Select onValueChange={(v) => setValue("subcategory_id", v)} defaultValue="">
                <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                <SelectContent>
                  {subcategories
                    .filter((sc) => sc.category === selectedCategoryId)
                    .map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>{sc.name} ({sc.code})</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Financial Year *</Label>
              <Input {...register("financial_year", { required: "Required" })} placeholder="e.g. 2026-27" className={errors.financial_year ? "border-destructive" : ""} />
              {errors.financial_year && <FieldError message={errors.financial_year.message} />}
            </div>
            <div className="space-y-1.5">
              <Label>Period Type</Label>
              <Select defaultValue="yearly" onValueChange={(v) => setValue("period_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["yearly", "quarterly", "monthly", "campaign"] as PeriodType[]).map((pt) => (
                    <SelectItem key={pt} value={pt}>{PERIOD_TYPE_LABELS[pt]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Allocated Amount *</Label>
              <Input
                {...register("allocated_amount", { required: "Required" })}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className={errors.allocated_amount ? "border-destructive" : ""}
              />
              {errors.allocated_amount && <FieldError message={errors.allocated_amount.message} />}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input {...register("currency")} defaultValue="INR" placeholder="INR" />
            </div>
          </div>

          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="create-budget-form" disabled={isSubmitting || create.isPending}>
            {create.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Creating...</> : "Create Budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Budget Dialog ────────────────────────────────────────────────────────

function EditBudgetDialog({
  budget,
  onSuccess,
}: {
  budget: Budget;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateBudget();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ allocated_amount: string; status: BudgetStatus }>({
    defaultValues: {
      allocated_amount: budget.allocated_amount,
      status: budget.status,
    },
  });

  const onSubmit = async (data: Record<string, string>) => {
    try {
      await update.mutateAsync({
        id: budget.id,
        data: {
          allocated_amount: data.allocated_amount,
          status: data.status as BudgetStatus,
        },
      });
      setOpen(false);
      onSuccess?.();
    } catch { /* error via update.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Budget</DialogTitle>
        </DialogHeader>
        <form id="edit-budget-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Allocated Amount *</Label>
            <Input
              {...register("allocated_amount", { required: "Required" })}
              type="number"
              step="0.01"
              min="0"
              className={errors.allocated_amount ? "border-destructive" : ""}
            />
            {errors.allocated_amount && <FieldError message={errors.allocated_amount.message} />}
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              defaultValue={budget.status}
              onValueChange={(v) => setValue("status", v as BudgetStatus)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["draft", "active", "exhausted", "frozen", "closed"] as BudgetStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{BUDGET_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="edit-budget-form" disabled={isSubmitting || update.isPending}>
            {update.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Budget Dialog ─────────────────────────────────────────────────────

function DeleteBudgetDialog({
  budget,
  onSuccess,
}: {
  budget: Budget;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const del = useDeleteBudget();

  const handleDelete = async () => {
    try {
      await del.mutateAsync(budget.id);
      setOpen(false);
      onSuccess?.();
    } catch { /* error via del.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Budget</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this budget?
        </p>
        {del.isError && del.error instanceof ApiError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {del.error.message}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
            {del.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Rule Dialog ────────────────────────────────────────────────────────

function CreateRuleDialog({
  budgetId,
  onSuccess,
}: {
  budgetId: string | null;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateRule();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRuleRequest & { budget_id: string }>();

  const onSubmit = async (data: Record<string, string>) => {
    try {
      await create.mutateAsync({ budget: data.budget_id });
      setOpen(false);
      reset();
      onSuccess?.();
    } catch { /* error via create.error */ }
  };

  const submitError =
    create.isError && create.error instanceof ApiError
      ? create.error.message
      : create.isError
      ? "Failed to create rule"
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5" disabled={!budgetId}>
          <Plus className="h-4 w-4" />
          New Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Budget Rule</DialogTitle>
        </DialogHeader>
        <form id="create-rule-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-3 text-xs text-blue-900 dark:text-blue-200">
            A rule will be created with default threshold values. You can edit them after creation.
          </div>
          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="create-rule-form" disabled={isSubmitting || create.isPending}>
            {create.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Creating...</> : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Rule Dialog ──────────────────────────────────────────────────────────

function EditRuleDialog({
  rule,
  onSuccess,
}: {
  rule: BudgetRule;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateRule();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<{
    warning_threshold_percent: string;
    approval_threshold_percent: string;
    hard_block_threshold_percent: string;
    allowed_variance_percent: string;
    require_hod_approval_on_variance: boolean;
  }>({
    defaultValues: {
      warning_threshold_percent: rule.warning_threshold_percent,
      approval_threshold_percent: rule.approval_threshold_percent,
      hard_block_threshold_percent: rule.hard_block_threshold_percent,
      allowed_variance_percent: rule.allowed_variance_percent,
      require_hod_approval_on_variance: rule.require_hod_approval_on_variance,
    },
  });

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      await update.mutateAsync({ id: rule.id, data: data as Record<string, string | boolean> });
      setOpen(false);
      onSuccess?.();
    } catch { /* error via update.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Budget Rule</DialogTitle>
        </DialogHeader>
        <form id="edit-rule-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Warning %</Label>
              <Input
                {...register("warning_threshold_percent", { required: "Required" })}
                type="number"
                step="0.01"
                min="0"
                className={errors.warning_threshold_percent ? "border-destructive" : ""}
              />
              {errors.warning_threshold_percent && <FieldError message={errors.warning_threshold_percent.message} />}
            </div>
            <div className="space-y-1.5">
              <Label>Approval %</Label>
              <Input
                {...register("approval_threshold_percent", { required: "Required" })}
                type="number"
                step="0.01"
                min="0"
                className={errors.approval_threshold_percent ? "border-destructive" : ""}
              />
              {errors.approval_threshold_percent && <FieldError message={errors.approval_threshold_percent.message} />}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Hard Block %</Label>
              <Input
                {...register("hard_block_threshold_percent", { required: "Required" })}
                type="number"
                step="0.01"
                min="0"
                className={errors.hard_block_threshold_percent ? "border-destructive" : ""}
              />
              {errors.hard_block_threshold_percent && <FieldError message={errors.hard_block_threshold_percent.message} />}
            </div>
            <div className="space-y-1.5">
              <Label>Allowed Variance %</Label>
              <Input
                {...register("allowed_variance_percent", { required: "Required" })}
                type="number"
                step="0.01"
                min="0"
                className={errors.allowed_variance_percent ? "border-destructive" : ""}
              />
              {errors.allowed_variance_percent && <FieldError message={errors.allowed_variance_percent.message} />}
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="edit-rule-form" disabled={isSubmitting || update.isPending}>
            {update.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Rule Dialog ────────────────────────────────────────────────────────

function DeleteRuleDialog({
  rule,
  onSuccess,
}: {
  rule: BudgetRule;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const del = useDeleteRule();

  const handleDelete = async () => {
    try {
      await del.mutateAsync(rule.id);
      setOpen(false);
      onSuccess?.();
    } catch { /* error via del.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Rule</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this rule? Budget reservations will fall back to defaults.
        </p>
        {del.isError && del.error instanceof ApiError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {del.error.message}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
            {del.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Review Variance Dialog ─────────────────────────────────────────────────────

function ReviewVarianceDialog({
  varianceRequest,
  onSuccess,
}: {
  varianceRequest: BudgetVarianceRequest;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const review = useReviewVarianceRequest();
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ review_note: string }>();

  const onSubmit = async (data: Record<string, string>) => {
    if (!decision) return;
    try {
      await review.mutateAsync({ id: varianceRequest.id, data: { decision, review_note: data.review_note } });
      setOpen(false);
      setDecision(null);
      onSuccess?.();
    } catch { /* error via review.error */ }
  };

  const submitError =
    review.isError && review.error instanceof ApiError
      ? review.error.message
      : review.isError
      ? "Failed to submit review"
      : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDecision(null); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          Review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Variance Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium">{varianceRequest.budget_name ?? varianceRequest.budget}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requested Amount</span>
              <span className="font-medium">{parseFloat(varianceRequest.requested_amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Utilization</span>
              <span className="font-medium">{varianceRequest.current_utilization_percent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Projected Utilization</span>
              <span className="font-medium">{varianceRequest.projected_utilization_percent}%</span>
            </div>
            {varianceRequest.reason && (
              <div className="pt-1 border-t border-border">
                <span className="text-muted-foreground">Reason: </span>
                <span>{varianceRequest.reason}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Decision *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={decision === "approved" ? "default" : "outline"}
                size="sm"
                className="gap-1.5 flex-1"
                onClick={() => setDecision("approved")}
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
              <Button
                type="button"
                variant={decision === "rejected" ? "destructive" : "outline"}
                size="sm"
                className="gap-1.5 flex-1"
                onClick={() => setDecision("rejected")}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>

          <form id="review-variance-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Review Note</Label>
              <Textarea {...register("review_note")} placeholder="Optional note..." rows={3} />
            </div>
            {submitError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
            )}
          </form>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            type="submit"
            form="review-variance-form"
            disabled={!decision || isSubmitting || review.isPending}
          >
            {review.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Submitting...</> : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── List Renderers ─────────────────────────────────────────────────────────────

function CategoryList({
  categories,
  isLoading,
}: {
  categories: BudgetCategory[];
  isLoading: boolean;
}) {
  if (isLoading) return <PageLoading />;
  if (categories.length === 0) {
    return <EmptyState message="No categories found. Create one above." icon={FolderOpen} />;
  }
  return (
    <div className="divide-y divide-border">
      {categories.map((cat) => (
        <div key={cat.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50">
          <div>
            <p className="text-sm font-medium">{cat.name}</p>
            <p className="text-xs text-muted-foreground">Code: {cat.code} &middot; {cat.is_active ? "Active" : "Inactive"}</p>
          </div>
          <div className="flex items-center gap-1">
            <EditCategoryDialog category={cat} />
            <DeleteCategoryDialog category={cat} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SubCategoryList({
  subcategories,
  isLoading,
}: {
  subcategories: BudgetSubCategory[];
  isLoading: boolean;
}) {
  if (isLoading) return <PageLoading />;
  if (subcategories.length === 0) {
    return <EmptyState message="No subcategories found." icon={Folder} />;
  }
  return (
    <div className="divide-y divide-border">
      {subcategories.map((sc) => (
        <div key={sc.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50">
          <div>
            <p className="text-sm font-medium">{sc.name}</p>
            <p className="text-xs text-muted-foreground">
              Code: {sc.code} &middot; Category: {sc.category_name ?? sc.category} &middot; {sc.is_active ? "Active" : "Inactive"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <EditSubCategoryDialog subcategory={sc} />
            <DeleteSubCategoryDialog subcategory={sc} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BudgetList({
  budgets,
  isLoading,
}: {
  budgets: Budget[];
  isLoading: boolean;
}) {
  if (isLoading) return <PageLoading />;
  if (budgets.length === 0) {
    return <EmptyState message="No budgets found." icon={Wallet} />;
  }
  return (
    <div className="divide-y divide-border">
      {budgets.map((b) => {
        const allocated = parseFloat(b.allocated_amount ?? "0");
        const reserved = parseFloat(b.reserved_amount ?? "0");
        const consumed = parseFloat(b.consumed_amount ?? "0");
        const available = allocated - reserved - consumed;
        const utilization = allocated > 0 ? ((reserved + consumed) / allocated) * 100 : 0;

        return (
          <div key={b.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium truncate">{b.category_name ?? b.category}</p>
                {b.subcategory_name && (
                  <span className="text-xs text-muted-foreground">› {b.subcategory_name}</span>
                )}
                <BudgetStatusBadge status={b.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {b.scope_node_name ?? b.scope_node} &middot; FY {b.financial_year} &middot; {b.currency} {allocated.toLocaleString()}
                &middot; <span className={utilization > 90 ? "text-orange-600" : ""}>Util {utilization.toFixed(1)}%</span>
                &middot; Available: {b.currency} {available.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-1 ml-4 shrink-0">
              <EditBudgetDialog budget={b} />
              <DeleteBudgetDialog budget={b} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RuleList({
  rules,
  isLoading,
}: {
  rules: BudgetRule[];
  isLoading: boolean;
}) {
  if (isLoading) return <PageLoading />;
  if (rules.length === 0) {
    return <EmptyState message="No rules found." icon={GitBranch} />;
  }
  return (
    <div className="divide-y divide-border">
      {rules.map((r) => (
        <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium">{r.budget_name ?? `Budget ${r.budget}`}</p>
              {!r.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Warn: {r.warning_threshold_percent}% &middot; Approve: {r.approval_threshold_percent}%
              &middot; Block: {r.hard_block_threshold_percent}% &middot; Variance: {r.allowed_variance_percent}%
            </p>
          </div>
          <div className="flex items-center gap-1 ml-4 shrink-0">
            <EditRuleDialog rule={r} />
            <DeleteRuleDialog rule={r} />
          </div>
        </div>
      ))}
    </div>
  );
}

function VarianceRequestList({
  varianceRequests,
  isLoading,
}: {
  varianceRequests: BudgetVarianceRequest[];
  isLoading: boolean;
}) {
  if (isLoading) return <PageLoading />;
  if (varianceRequests.length === 0) {
    return <EmptyState message="No variance requests found." icon={AlertTriangle} />;
  }
  return (
    <div className="divide-y divide-border">
      {varianceRequests.map((vr) => (
        <div key={vr.id} className="px-4 py-3 hover:bg-accent/50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium">{vr.budget_name ?? `Budget ${vr.budget}`}</p>
                <VarianceStatusBadge status={vr.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {SOURCE_TYPE_LABELS[vr.source_type] ?? vr.source_type} › {vr.source_id} &middot; Amount: {parseFloat(vr.requested_amount).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Util: {vr.current_utilization_percent}% → {vr.projected_utilization_percent}%
              </p>
              {vr.reason && <p className="text-xs text-muted-foreground mt-0.5">Reason: {vr.reason}</p>}
            </div>
            {vr.status === "pending" && (
              <ReviewVarianceDialog varianceRequest={vr} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsumptionList({
  consumptions,
  isLoading,
}: {
  consumptions: BudgetConsumption[];
  isLoading: boolean;
}) {
  if (isLoading) return <PageLoading />;
  if (consumptions.length === 0) {
    return <EmptyState message="No consumptions recorded." icon={ArrowDownToLine} />;
  }
  return (
    <div className="divide-y divide-border">
      {consumptions.map((c) => (
        <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ConsumptionTypeBadge ct={c.consumption_type} />
              <span className="text-sm font-medium">{parseFloat(c.amount).toLocaleString()}</span>
              <Badge variant="outline" className="text-xs">{c.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {SOURCE_TYPE_LABELS[c.source_type] ?? c.source_type} › {c.source_id}
              &middot; Budget: {c.budget_name ?? c.budget}
            </p>
            {c.note && <p className="text-xs text-muted-foreground mt-0.5">{c.note}</p>}
          </div>
          <p className="text-xs text-muted-foreground ml-4 shrink-0">
            {new Date(c.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmtCurrency(amount: string | number | null | undefined): string {
  if (amount == null || amount === "") return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function UtilBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden w-20">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

// ── KPI Strip ─────────────────────────────────────────────────────────────────

function KpiStrip({ data }: { data: any }) {
  const s = data?.summary;
  if (!s) return null;
  const kpis = [
    { label: "Total Allocated", value: fmtCurrency(s.total_allocated), icon: DollarSign, color: "text-blue-600" },
    { label: "Reserved", value: fmtCurrency(s.total_reserved), icon: Bookmark, color: "text-amber-600" },
    { label: "Consumed", value: fmtCurrency(s.total_consumed), icon: ArrowDownToLine, color: "text-orange-600" },
    { label: "Available", value: fmtCurrency(s.total_available), icon: Wallet, color: "text-green-600" },
    { label: "Regions", value: String(s.regions_count), icon: MapPin, color: "text-purple-600" },
    { label: "Parks", value: String(s.parks_count), icon: Target, color: "text-cyan-600" },
    { label: "Budget Lines", value: String(s.budgets_count), icon: BarChart3, color: "text-indigo-600" },
    { label: "Campaigns", value: String(s.campaigns_count), icon: TrendingUp, color: "text-pink-600" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {kpis.map((k) => (
        <div key={k.label} className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <k.icon className={cn("h-3.5 w-3.5", k.color)} />
            <span className="text-[10px] text-muted-foreground leading-none">{k.label}</span>
          </div>
          <p className="text-sm font-bold text-foreground truncate">{k.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Region Cards ───────────────────────────────────────────────────────────────

const REGION_COLORS: Record<string, string> = {
  North: "border-l-blue-400",
  South: "border-l-green-400",
  West: "border-l-orange-400",
  Incity: "border-l-purple-400",
};

function RegionCards({ regions }: { regions: any[] }) {
  if (!regions?.length) return null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {regions.map((r) => (
        <div key={r.id} className={cn(
          "rounded-lg border bg-card p-3 border-l-4 pl-3",
          REGION_COLORS[r.name] ?? "border-l-gray-400"
        )}>
          <p className="text-sm font-semibold text-foreground mb-2">{r.name}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Allocated</span>
              <span className="font-medium tabular-nums">{fmtCurrency(r.allocated_amount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Parks</span>
              <span className="font-medium">{r.parks_count}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Budgets</span>
              <span className="font-medium">{r.budgets_count}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Utilization</span>
              <span className={cn(
                "text-[10px] font-bold tabular-nums",
                r.utilization_percent >= 90 ? "text-red-600" : r.utilization_percent >= 70 ? "text-amber-600" : "text-green-600"
              )}>{r.utilization_percent}%</span>
            </div>
            <UtilBar pct={r.utilization_percent} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Region / Park Matrix ───────────────────────────────────────────────────────

function ParkRow({ park }: { park: any }) {
  const [open, setOpen] = useState(false);
  const hasSubcats = park.top_subcategories?.length > 0;

  return (
    <div className="border-b border-border last:border-0">
      <div
        className="flex items-center gap-3 px-3 py-2 hover:bg-accent/40 cursor-pointer"
        onClick={() => hasSubcats && setOpen(!open)}
      >
        <span className="w-4 shrink-0">
          {hasSubcats ? (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : null}
        </span>
        <span className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate">{park.name}</span>
        </span>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-xs font-medium tabular-nums">{fmtCurrency(park.allocated_amount)}</p>
            <p className="text-[10px] text-muted-foreground">{park.budgets_count} budget{park.budgets_count !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-1.5 w-28">
            <UtilBar pct={park.utilization_percent} />
            <span className="text-[10px] tabular-nums w-8 text-right font-medium">{park.utilization_percent}%</span>
          </div>
        </div>
      </div>
      {open && hasSubcats && (
        <div className="bg-secondary/20 px-6 py-2 border-t border-border">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {park.top_subcategories.map((sc: any) => (
              <div key={sc.id} className="rounded bg-card border px-2 py-1">
                <p className="text-[10px] text-muted-foreground truncate">{sc.name}</p>
                <p className="text-xs font-semibold tabular-nums">{fmtCurrency(sc.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ParkMatrix({ parks, regions }: { parks: any[]; regions: any[] }) {
  const [expandedRegions, setExpandedRegions] = useState<Record<number, boolean>>({});

  const toggleRegion = (id: number) =>
    setExpandedRegions(prev => ({ ...prev, [id]: !prev[id] }));

  if (!parks?.length) return null;

  // Group parks by region
  const parksByRegion: Record<number, any[]> = {};
  for (const park of parks) {
    if (!parksByRegion[park.region_id]) parksByRegion[park.region_id] = [];
    parksByRegion[park.region_id].push(park);
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-secondary/20 flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Region / Park Matrix</span>
      </div>
      {/* Header row */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/30 border-b border-border">
        <span className="w-4" />
        <span className="flex-1 text-[10px] font-semibold text-muted-foreground uppercase">Park / Location</span>
        <span className="shrink-0 text-[10px] font-semibold text-muted-foreground uppercase w-24 text-right">Allocated</span>
        <span className="shrink-0 text-[10px] font-semibold text-muted-foreground uppercase w-28 text-right">Utilization</span>
      </div>
      {regions.map((region: any) => {
        const regionParks = parksByRegion[region.id] ?? [];
        const isOpen = expandedRegions[region.id] !== false; // default open
        return (
          <div key={region.id}>
            {/* Region header */}
            <div
              className="flex items-center gap-3 px-3 py-2 bg-secondary/10 hover:bg-secondary/20 cursor-pointer border-b border-border"
              onClick={() => toggleRegion(region.id)}
            >
              {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="flex-1 text-sm font-semibold">{region.name}</span>
              <span className="text-xs text-muted-foreground">{regionParks.length} park{regionParks.length !== 1 ? "s" : ""}</span>
            </div>
            {isOpen && regionParks.map((park: any) => (
              <ParkRow key={park.id} park={park} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Category Chart ────────────────────────────────────────────────────────────

const CAT_COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#6366f1"];

function CategoryChart({ categories }: { categories: any[] }) {
  if (!categories?.length) return null;
  const data = categories.slice(0, 10).map((c: any, i: number) => ({
    name: c.name.length > 22 ? c.name.slice(0, 22) + "…" : c.name,
    amount: parseFloat(c.allocated_amount || 0),
    count: c.budgets_count,
    color: CAT_COLORS[i % CAT_COLORS.length],
  }));
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
          <Tooltip formatter={(v: number) => [fmtCurrency(v), "Allocated"]} />
          <Bar dataKey="amount" radius={[3, 3, 0, 0]} name="Allocated">
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Campaign Table ────────────────────────────────────────────────────────────

function CampaignTable({ campaigns }: { campaigns: any[] }) {
  if (!campaigns?.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            {["Campaign", "Location", "Region", "Category", "Subcategory", "Approved Amt", "Status"].map(h => (
              <th key={h} className="pb-1.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 first:pl-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {campaigns.slice(0, 25).map((c: any) => (
            <tr key={c.id} className="hover:bg-accent/30">
              <td className="px-2 py-1.5 font-medium text-foreground truncate max-w-[160px]">{c.name}</td>
              <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[120px]">{c.scope_node_name}</td>
              <td className="px-2 py-1.5 text-muted-foreground">{c.region_name}</td>
              <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[120px]">{c.category_name}</td>
              <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[120px]">{c.subcategory_name}</td>
              <td className="px-2 py-1.5 font-semibold tabular-nums text-right">{fmtCurrency(c.approved_amount)}</td>
              <td className="px-2 py-1.5">
                <span className={cn(
                  "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  c.status === "internally_approved" ? "bg-green-100 text-green-800" :
                  c.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                )}>{c.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Budgets Dashboard Tab ──────────────────────────────────────────────────────

function BudgetsDashboardTab() {
  const { data, isLoading } = useBudgetOverview();

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[360px] items-center justify-center text-sm text-muted-foreground">
        No budget overview data available.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-5 px-6 py-5">
        <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-sm shrink-0">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Budget Control Center</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                Marketing budget by region, category, campaign, and utilization
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Live view of seeded FY budget lines, available funds, campaign coverage, and regional allocation health.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 px-4 py-3 text-right">
              <p className="text-xs text-muted-foreground">Total available</p>
              <p className="text-xl font-semibold tabular-nums text-emerald-500">
                {fmtCurrency(data.summary?.total_available ?? 0)}
              </p>
            </div>
          </div>
        </div>

      {/* KPI Strip */}
      <KpiStrip data={data} />

      {/* Region Cards */}
      {data.regions?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Budget by Region</p>
          <RegionCards regions={data.regions} />
        </div>
      )}

      {/* Two column: Park Matrix + Category Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ParkMatrix parks={data.parks} regions={data.regions} />
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-secondary/20 flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category Breakdown</span>
            </div>
            <div className="p-3">
              <CategoryChart categories={data.categories} />
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Activity */}
      {data.campaigns?.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-secondary/20 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaign Activity</span>
            <span className="ml-1 text-[10px] text-muted-foreground">({data.campaigns.length} total)</span>
          </div>
          <CampaignTable campaigns={data.campaigns} />
        </div>
      )}
      </div>
    </div>
  );
}


export default function BudgetsPage() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("budgets");
  const [budgetViewMode, setBudgetViewMode] = useState<"dashboard" | "list">("dashboard");

  // Filter states per tab
  const [budgetStatusFilter, setBudgetStatusFilter] = useState<string>("all");
  const [varianceStatusFilter, setVarianceStatusFilter] = useState<string>("all");
  const [consumptionFilters, setConsumptionFilters] = useState<{
    source_type?: string;
    consumption_type?: string;
  }>({});

  // List data
  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { data: nodes = [], isLoading: nodesLoading } = useScopeNodes(selectedOrgId ?? undefined);
  const { data: categories = [], isLoading: catsLoading } = useCategories(
    selectedOrgId ? { org: selectedOrgId } : undefined,
  );
  const activeCategoryId =
    selectedCategoryId && selectedCategoryId !== "__all__" ? selectedCategoryId : null;
  const { data: subcategories = [], isLoading: subsLoading } = useSubCategories(
    activeCategoryId ? { category: activeCategoryId } : undefined,
  );
  const { data: budgets = [], isLoading: budgetsLoading, refetch: refetchBudgets } = useBudgets(
    selectedNodeId && selectedNodeId !== "__all__"
      ? { scope_node: selectedNodeId, status: budgetStatusFilter !== "all" ? budgetStatusFilter : undefined }
      : { status: budgetStatusFilter !== "all" ? budgetStatusFilter : undefined },
  );
  const { data: rules = [], isLoading: rulesLoading } = useRules(
    selectedBudgetId ? { budget: selectedBudgetId } : undefined,
  );
  const { data: consumptions = [], isLoading: consumptionsLoading } = useConsumptions(
    selectedBudgetId
      ? { budget: selectedBudgetId, ...consumptionFilters }
      : consumptionFilters,
  );
  const { data: varianceRequests = [], isLoading: varianceLoading } = useVarianceRequests(
    selectedBudgetId
      ? { budget: selectedBudgetId, status: varianceStatusFilter !== "all" ? varianceStatusFilter : undefined }
      : { status: varianceStatusFilter !== "all" ? varianceStatusFilter : undefined },
  );

  const renderTabToolbar = (): { left: React.ReactNode; right?: React.ReactNode } => {
    switch (activeTab) {
      case "budgets":
        return (
          {
            left: (
              <div className="flex min-h-11 items-center gap-3">
                {/* View mode toggle */}
                <div className="flex items-center border rounded-md overflow-hidden">
                  <button
                    onClick={() => setBudgetViewMode("dashboard")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
                      budgetViewMode === "dashboard"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => setBudgetViewMode("list")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
                      budgetViewMode === "list"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    <List className="h-3.5 w-3.5" />
                    List
                  </button>
                </div>
                {budgetViewMode === "list" && (
                  <>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={budgetStatusFilter} onValueChange={setBudgetStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="exhausted">Exhausted</SelectItem>
                        <SelectItem value="frozen">Frozen</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            ),
            right: budgetViewMode === "list" ? (
              <CreateBudgetDialog
                orgId={selectedOrgId}
                scopeNodeId={selectedNodeId}
                onSuccess={() => refetchBudgets()}
              />
            ) : null,
          }
        );
      case "categories":
        return (
          {
            left: (
              <div className="flex min-h-11 items-center">
                <p className="text-sm text-muted-foreground">
                  {categories.length} categor{categories.length === 1 ? "y" : "ies"}
                </p>
              </div>
            ),
            right: <CreateCategoryDialog orgId={selectedOrgId} />,
          }
        );
      case "subcategories":
        return (
          {
            left: (
              <div className="flex min-h-11 items-center gap-2">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select
                  value={selectedCategoryId ?? ""}
                  onValueChange={(v) => setSelectedCategoryId(v === "__all__" ? null : v)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ),
            right: (
              <CreateSubCategoryDialog
                categoryId={selectedCategoryId && selectedCategoryId !== "__all__" ? selectedCategoryId : null}
              />
            ),
          }
        );
      case "rules":
        return (
          {
            left: (
              <div className="flex min-h-11 items-center">
                <p className="text-sm text-muted-foreground">
                  Select a budget to filter rules, or create a new one.
                </p>
              </div>
            ),
            right: <CreateRuleDialog budgetId={selectedBudgetId} />,
          }
        );
      case "variance-requests":
        return (
          {
            left: (
              <div className="flex min-h-11 items-center gap-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={varianceStatusFilter} onValueChange={setVarianceStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ),
          }
        );
      case "consumptions":
        return (
          {
            left: (
              <div className="flex min-h-11 items-center">
                <p className="text-xs text-muted-foreground">
                  Read-only ledger. Filter by budget above.
                </p>
              </div>
            ),
          }
        );
      default:
        return { left: null };
    }
  };

  const toolbar = renderTabToolbar();

  return (
    <V2Shell
      title="Budgets"
      titleIcon={<Wallet className="h-5 w-5 text-muted-foreground" />}
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
                setSelectedCategoryId(null);
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

          <Label className="text-xs text-muted-foreground ml-2">Node</Label>
          {nodesLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Select
              value={selectedNodeId ?? ""}
              onValueChange={(v) => setSelectedNodeId(v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All nodes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All nodes</SelectItem>
                {nodes.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      }
    >
      {/* Tabbed content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="border-b border-border px-6 pt-3">
            <TabsList className="gap-1">
              <TabsTrigger value="budgets">Budgets</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="subcategories">Subcategories</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="variance-requests">
                Variance Requests
                {varianceRequests.filter((v) => v.status === "pending").length > 0 && (
                  <Badge variant="destructive" className="ml-1.5 text-xs">
                    {varianceRequests.filter((v) => v.status === "pending").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="consumptions">Consumptions</TabsTrigger>
            </TabsList>
          </div>

          <div className="grid min-h-[72px] grid-cols-1 items-center gap-4 border-b border-border px-6 py-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">{toolbar.left}</div>
            <div className="flex min-h-11 items-center justify-start md:justify-end">
              {toolbar.right ?? null}
            </div>
          </div>

          {/* BUDGETS TAB */}
          <TabsContent value="budgets" className="m-0 data-[state=inactive]:hidden flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              {budgetViewMode === "dashboard" ? (
                <BudgetsDashboardTab />
              ) : (
                <BudgetList budgets={budgets} isLoading={budgetsLoading} />
              )}
            </ScrollArea>
          </TabsContent>

          {/* CATEGORIES TAB */}
          <TabsContent value="categories" className="m-0 data-[state=inactive]:hidden flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <CategoryList categories={categories} isLoading={catsLoading} />
            </ScrollArea>
          </TabsContent>

          {/* SUBCATEGORIES TAB */}
          <TabsContent value="subcategories" className="m-0 data-[state=inactive]:hidden flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <SubCategoryList
                subcategories={subcategories}
                isLoading={subsLoading}
              />
            </ScrollArea>
          </TabsContent>

          {/* RULES TAB */}
          <TabsContent value="rules" className="m-0 data-[state=inactive]:hidden flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <RuleList rules={rules} isLoading={rulesLoading} />
            </ScrollArea>
          </TabsContent>

          {/* VARIANCE REQUESTS TAB */}
          <TabsContent value="variance-requests" className="m-0 data-[state=inactive]:hidden flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <VarianceRequestList
                varianceRequests={varianceRequests}
                isLoading={varianceLoading}
              />
            </ScrollArea>
          </TabsContent>

          {/* CONSUMPTIONS TAB */}
          <TabsContent value="consumptions" className="m-0 data-[state=inactive]:hidden flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <ConsumptionList consumptions={consumptions} isLoading={consumptionsLoading} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </V2Shell>
  );
}
