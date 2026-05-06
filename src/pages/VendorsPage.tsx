import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { V2Shell } from "@/components/v2/V2Shell";
import {
  useInvitations,
  useCreateInvitation,
  useCancelInvitation,
  useSubmissions,
  useSendToFinance,
  useReopenSubmission,
  useVendors,
  useMarketingApprove,
  useMarketingReject,
  useResendVendorActivation,
  useAttachments,
} from "@/lib/hooks/useV2Vendor";
import { useOrganizations, useScopeNodes } from "@/lib/hooks/useScopeNodes";
import type {
  VendorInvitation,
  VendorOnboardingSubmission,
  Vendor,
  VendorProfileRevision,
} from "@/lib/types/v2vendor";
import {
  INVITATION_STATUS_LABELS,
  SUBMISSION_STATUS_LABELS,
  MARKETING_STATUS_LABELS,
  OPERATIONAL_STATUS_LABELS,
  PROFILE_REVISION_STATUS_LABELS,
  type InvitationStatus,
  type SubmissionStatus,
  type MarketingStatus,
} from "@/lib/types/v2vendor";
import {
  listVendorProfileRevisions,
  getVendorProfileRevision,
  financeApproveProfileRevision,
  financeRejectProfileRevision,
  reopenProfileRevision,
  applyProfileRevision,
  cancelProfileRevision,
} from "@/lib/api/v2vendor";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Mail,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Send,
  RotateCcw,
  CheckCircle,
  XCircle,
  ShieldCheck,
  FileText,
  KeyRound,
  Check,
  ShieldAlert,
  History,
} from "lucide-react";

// â”€â”€ Status badge helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const INV_COLORS: Record<InvitationStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  opened: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  submitted: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  expired: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const SUB_COLORS: Record<SubmissionStatus, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  sent_to_finance: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  finance_approved: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  finance_rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  reopened: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  marketing_pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  marketing_approved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  activated: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

function InvStatusBadge({ status }: { status: InvitationStatus }) {
  return (
    <Badge className={INV_COLORS[status] ?? ""} variant="outline">
      {INVITATION_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function SubStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge className={SUB_COLORS[status] ?? ""} variant="outline">
      {SUBMISSION_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// â”€â”€ Create Invitation Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CreateInvitationDialog({
  orgId,
}: {
  orgId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateInvitation();
  const { data: scopeNodes = [] } = useScopeNodes(orgId ?? undefined);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<{
    org: string;
    scope_node: string;
    vendor_email: string;
    vendor_name_hint: string;
  }>();

  // Sync org when prop changes
  useEffect(() => {
    if (orgId) {
      reset((r) => ({ ...r, org: orgId }));
    }
  }, [orgId, reset]);

  function onSubmit(data: {
    org: string;
    scope_node: string;
    vendor_email: string;
    vendor_name_hint: string;
  }) {
    create.mutate(
      {
        org: data.org,
        scope_node: data.scope_node,
        vendor_email: data.vendor_email,
        vendor_name_hint: data.vendor_name_hint,
      },
      {
        onSuccess: () => {
          reset();
          setOpen(false);
        },
        onError: () => {
          // Error is surfaced via create.error
        },
      }
    );
  }

  function handleClose(v: boolean) {
    setOpen(v);
    if (!v) reset();
  }

  const submitError =
    create.isError && create.error instanceof ApiError
      ? create.error.message
      : create.isError
      ? "Failed to create invitation"
      : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5" disabled={!orgId}>
          <Plus className="h-4 w-4" />
          Invite Vendor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Vendor</DialogTitle>
          <p className="text-sm text-muted-foreground">
            The vendor will receive a secure onboarding link by email.
          </p>
        </DialogHeader>
        <form
          id="create-invitation-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <input type="hidden" {...register("org")} value={orgId ?? ""} />

          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Controller
              name="scope_node"
              control={control}
              rules={{ required: "Please select a unit" }}
              render={({ field }) => (
                <select
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    errors.scope_node ? "border-destructive" : "border-input"
                  }`}
                >
                  <option value="">Select unit</option>
                  {scopeNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.code})
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.scope_node && (
              <p className="text-xs text-destructive">{errors.scope_node.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vendor_email">Vendor Email</Label>
            <Input
              id="vendor_email"
              type="email"
              {...register("vendor_email", { required: "Required" })}
              placeholder="vendor@company.com"
              className={errors.vendor_email ? "border-destructive" : ""}
            />
            {errors.vendor_email && (
              <p className="text-xs text-destructive">{String(errors.vendor_email.message)}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vendor_name_hint">Vendor Name Hint <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="vendor_name_hint"
              {...register("vendor_name_hint")}
              placeholder="e.g. Acme Corp"
            />
          </div>

          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-invitation-form"
            disabled={create.isPending}
          >
            {create.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <><Mail className="mr-1.5 h-4 w-4" /> Send Invitation</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// â”€â”€ Cancel Invitation Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CancelInvitationDialog({ invitation }: { invitation: VendorInvitation }) {
  const [open, setOpen] = useState(false);
  const cancel = useCancelInvitation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
          <XCircle className="h-3.5 w-3.5" /> Cancel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Invitation</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cancel invitation for <strong>{invitation.vendor_email}</strong>? This cannot be undone.
        </p>
        {cancel.isError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {cancel.error instanceof ApiError ? cancel.error.message : "Failed to cancel"}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Keep</Button>
          <Button
            variant="destructive"
            onClick={() => cancel.mutateAsync(invitation.id).then(() => setOpen(false))}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Cancelling...</> : "Cancel Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// â”€â”€ Send to Finance Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SendToFinanceDialog({ submission }: { submission: VendorOnboardingSubmission }) {
  const [open, setOpen] = useState(false);
  const send = useSendToFinance();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Send className="h-4 w-4" /> Send to Finance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send to Finance</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Send submission by <strong>{submission.normalized_vendor_name ?? submission.id}</strong> to finance for review?
        </p>
        {send.isError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {send.error instanceof ApiError ? send.error.message : "Failed to send"}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => send.mutateAsync(submission.id).then(() => setOpen(false))}
            disabled={send.isPending}
          >
            {send.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Sending...</>
            ) : <><Send className="mr-1.5 h-4 w-4" /> Send to Finance</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// â”€â”€ Reopen Submission Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ReopenSubmissionDialog({ submission }: { submission: VendorOnboardingSubmission }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const reopen = useReopenSubmission();

  const handleReopen = async () => {
    await reopen.mutateAsync({ id: submission.id, data: { note: note || undefined } });
    setOpen(false);
    setNote("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setNote("");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <RotateCcw className="h-4 w-4" /> Reopen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reopen Submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Reopen submission by <strong>{submission.normalized_vendor_name ?? submission.id}</strong>?
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="reopen-note">Note</Label>
            <Input
              id="reopen-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note..."
            />
          </div>
          {reopen.isError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {reopen.error instanceof ApiError ? reopen.error.message : "Failed to reopen"}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); setNote(""); }}>Cancel</Button>
          <Button onClick={handleReopen} disabled={reopen.isPending}>
            {reopen.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Reopening...</>
            ) : <><RotateCcw className="mr-1.5 h-4 w-4" /> Reopen</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// â”€â”€ Marketing Approve Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MarketingApproveDialog({ vendor }: { vendor: Vendor }) {
  const [open, setOpen] = useState(false);
  const [poMandate, setPoMandate] = useState(false);
  const approve = useMarketingApprove();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-green-700 dark:text-green-300">
          <CheckCircle className="h-4 w-4" /> Approve Marketing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Vendor â€” Marketing</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Approve <strong>{vendor.vendor_name}</strong> for marketing?
          </p>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="po-mandate"
              checked={poMandate}
              onChange={(e) => setPoMandate(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="po-mandate" className="text-sm font-normal">
              Enable PO mandate
            </Label>
          </div>
          {approve.isError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {approve.error instanceof ApiError ? approve.error.message : "Failed to approve"}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() =>
              approve
                .mutateAsync({ id: vendor.id, data: { po_mandate_enabled: poMandate } })
                .then(() => setOpen(false))
                .catch(() => {
                  // Error is rendered inside the dialog from the mutation state.
                })
            }
            disabled={approve.isPending}
          >
            {approve.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Approving...</>
            ) : <><CheckCircle className="mr-1.5 h-4 w-4" /> Approve</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// â”€â”€ Marketing Reject Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MarketingRejectDialog({ vendor }: { vendor: Vendor }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const reject = useMarketingReject();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setNote("");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive">
          <XCircle className="h-4 w-4" /> Reject Marketing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Vendor â€” Marketing</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Reject <strong>{vendor.vendor_name}</strong> for marketing?
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="mkt-reject-note">Note</Label>
            <Input
              id="mkt-reject-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Rejection reason..."
            />
          </div>
          {reject.isError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {reject.error instanceof ApiError ? reject.error.message : "Failed to reject"}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); setNote(""); }}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() =>
              reject
                .mutateAsync({ id: vendor.id, data: { note: note || undefined } })
                .then(() => setOpen(false))
            }
            disabled={reject.isPending}
          >
            {reject.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Rejecting...</>
            ) : <><XCircle className="mr-1.5 h-4 w-4" /> Reject</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// â”€â”€ Resend Activation Button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ResendActivationButton({ vendor }: { vendor: Vendor }) {
  const resend = useResendVendorActivation();

  const isActivated = vendor.portal_activated;
  const hasEmail = !!vendor.email || !!vendor.portal_email;
  const label = isActivated ? "Resend Activation Link" : "Send Activation Link";
  const disabled = !hasEmail || resend.isPending;

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5"
      disabled={disabled}
      onClick={() => resend.mutate(vendor.id)}
    >
      {resend.isPending ? (
        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</>
      ) : resend.isSuccess ? (
        <><Check className="h-3.5 w-3.5 text-green-600" /> Sent!</>
      ) : (
        <><KeyRound className="h-3.5 w-3.5" /> {label}</>
      )}
    </Button>
  );
}

// â”€â”€ Tab: Invitations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function InvitationsTab({
  orgId,
  setOrgId,
}: {
  orgId: string | null;
  setOrgId: (id: string | null) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [emailFilter, setEmailFilter] = useState<string>("");

  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { data: invitations = [], isLoading } = useInvitations(
    statusFilter !== "all"
      ? { org: orgId ?? undefined, status: statusFilter, vendor_email: emailFilter || undefined }
      : { org: orgId ?? undefined, vendor_email: emailFilter || undefined },
  );

  // Auto-select first org
  useEffect(() => {
    if (!orgId && organizations.length === 1 && organizations[0]) {
      setOrgId(organizations[0].id);
    }
  }, [orgId, organizations]);

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
      {/* List */}
      <div className="flex w-full md:w-96 flex-col border-b border-border md:border-b-0 md:border-r max-h-[45vh] md:max-h-none">
        {/* Filters */}
        <div className="border-b border-border p-3 space-y-2">
          {orgsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <Select value={orgId ?? ""} onValueChange={setOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Select org" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name} ({o.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Filter by email..."
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(INVITATION_STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No invitations found
            </div>
          ) : (
            <div className="py-1">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inv.vendor_email}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {inv.vendor_name_hint || "â€”"}
                    </p>
                  </div>
                  <InvStatusBadge status={inv.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail placeholder */}
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Select an invitation to view details
      </div>
    </div>
  );
}

// â”€â”€ Tab: Submissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SubmissionsTab({
  orgId,
  setOrgId,
}: {
  orgId: string | null;
  setOrgId: (id: string | null) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { data: submissions = [], isLoading } = useSubmissions(
    statusFilter !== "all"
      ? { org: orgId ?? undefined, status: statusFilter }
      : { org: orgId ?? undefined },
  );

  useEffect(() => {
    if (!orgId && organizations.length === 1 && organizations[0]) {
      setOrgId(organizations[0].id);
    }
  }, [orgId, organizations]);

  const selected = submissions.find((s) => s.id === selectedId);
  const { data: attachments = [] } = useAttachments(selected ? { submission: selected.id } : undefined);

  const canSendToFinance = selected?.status === "reopened";
  // Note: under Option B (auto-send-to-finance), vendor finalize
  // automatically transitions submissions to sent_to_finance. The button
  // remains for the reopen path (finance_rejected â†’ reopened â†’ re-send).
  const canReopen = selected?.status === "finance_rejected";

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
      {/* List */}
      <div className="flex w-full md:w-96 flex-col border-b border-border md:border-b-0 md:border-r max-h-[45vh] md:max-h-none">
        <div className="border-b border-border p-3 space-y-2">
          {orgsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <Select value={orgId ?? ""} onValueChange={(v) => { setOrgId(v); setSelectedId(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select org" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name} ({o.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {Object.entries(SUBMISSION_STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No submissions found
            </div>
          ) : (
            <div className="py-1">
              {submissions.map((sub) => (
                <button
                  key={sub.id}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                    sub.id === selectedId ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedId(sub.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {sub.normalized_vendor_name ?? sub.id}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {sub.normalized_email ?? "â€”"}
                    </p>
                  </div>
                  <SubStatusBadge status={sub.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <ScrollArea className="flex-1">
        {selected ? (
          <div className="p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold">{selected.normalized_vendor_name ?? "â€”"}</h2>
                <p className="text-xs text-muted-foreground">{selected.id}</p>
              </div>
              <SubStatusBadge status={selected.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Email", value: selected.normalized_email ?? "â€”" },
                { label: "Phone", value: selected.normalized_phone ?? "â€”" },
                { label: "Type", value: selected.normalized_vendor_type ?? "â€”" },
                { label: "GST Registered", value: String(selected.normalized_gst_registered ?? "â€”") },
                { label: "GSTIN", value: selected.normalized_gstin ?? "â€”" },
                { label: "PAN", value: selected.normalized_pan ?? "â€”" },
                { label: "City", value: selected.normalized_city ?? "â€”" },
                { label: "State", value: selected.normalized_state ?? "â€”" },
                { label: "Bank", value: selected.normalized_bank_name ?? "â€”" },
                { label: "IFSC", value: selected.normalized_ifsc ?? "â€”" },
                { label: "Account", value: selected.normalized_account_number ? "â€¢â€¢â€¢â€¢" + selected.normalized_account_number.slice(-4) : "â€”" },
                { label: "Mode", value: selected.submission_mode },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-border bg-secondary/20 p-2.5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>

            {selected.finance_vendor_code && (
              <div className="rounded-lg border border-border bg-secondary/20 p-2.5">
                <p className="text-xs text-muted-foreground">SAP Vendor Code</p>
                <p className="text-sm font-medium font-mono">{selected.finance_vendor_code}</p>
              </div>
            )}

            {/* Attachments */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Attachments ({attachments.length})
              </h3>
              {attachments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No attachments</p>
              ) : (
                <div className="space-y-1">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-secondary/20 px-2.5 py-1.5"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm truncate flex-1">{att.title}</span>
                      <span className="text-xs text-muted-foreground">{att.document_type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {canSendToFinance && <SendToFinanceDialog submission={selected} />}
              {canReopen && <ReopenSubmissionDialog submission={selected} />}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a submission to view details
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// â”€â”€ Tab: Vendors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€ Vendor Profile Revision Review Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const REV_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  finance_approved: "bg-purple-100 text-purple-700",
  finance_rejected: "bg-red-100 text-red-700",
  reopened: "bg-orange-100 text-orange-700",
  applied: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function VendorRevisionReviewPanel({ vendor }: { vendor: Vendor }) {
  const qc = useQueryClient();
  const [selectedRevId, setSelectedRevId] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const revisionsQ = useQuery({
    queryKey: ["vendor-revisions", vendor.id],
    queryFn: () => listVendorProfileRevisions(vendor.id),
  });

  const detailQ = useQuery({
    queryKey: ["vendor-revision-detail", vendor.id, selectedRevId],
    queryFn: () => selectedRevId ? getVendorProfileRevision(vendor.id, selectedRevId) : null,
    enabled: !!selectedRevId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["vendor-revisions", vendor.id] });
    qc.invalidateQueries({ queryKey: ["vendor-revision-detail", vendor.id, selectedRevId] });
    qc.invalidateQueries({ queryKey: ["vendors"] });
    setActionError(null);
  };

  function mutate(fn: () => Promise<VendorProfileRevision>) {
    return fn().then(invalidate).catch(e => setActionError(e instanceof Error ? e.message : "Action failed."));
  }

  const revisions = revisionsQ.data ?? [];
  const detail = detailQ.data;

  if (revisionsQ.isLoading) {
    return <div className="flex items-center gap-2 py-4 text-muted-foreground text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Loading revisionsâ€¦</div>;
  }

  if (revisions.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No profile revisions yet.</p>;
  }

  return (
    <div className="space-y-3">
      {/* List */}
      <div className="space-y-1.5">
        {revisions.map(rev => (
          <button
            key={rev.id}
            onClick={() => setSelectedRevId(selectedRevId === rev.id ? null : rev.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs transition-colors ${
              selectedRevId === rev.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
            }`}
          >
            <span className="font-medium">Rev #{rev.revision_number}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{rev.changed_fields_json.length} fields</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${REV_STATUS_COLORS[rev.status] ?? ""}`}>
                {PROFILE_REVISION_STATUS_LABELS[rev.status]}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Detail */}
      {detail && (
        <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Revision #{detail.revision_number} â€” {PROFILE_REVISION_STATUS_LABELS[detail.status]}</p>
            <p className="text-[10px] text-muted-foreground">{detail.submitted_at ? new Date(detail.submitted_at).toLocaleDateString() : "Not submitted"}</p>
          </div>

          {/* Changed fields diff */}
          {detail.changed_fields_json.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Changes</p>
              {detail.changed_fields_json.map(field => {
                const oldVal = String(detail.source_revision_snapshot_json[field] ?? "â€”");
                const newVal = String(detail.proposed_snapshot_json[field] ?? "â€”");
                return (
                  <div key={field} className="text-xs">
                    <span className="font-medium text-foreground capitalize">{field.replace(/_/g, " ")}: </span>
                    <span className="line-through text-muted-foreground">{oldVal}</span>
                    <span className="mx-1 text-muted-foreground">â†’</span>
                    <span className="text-primary font-medium">{newVal}</span>
                  </div>
                );
              })}
            </div>
          )}

          {actionError && <p className="text-xs text-destructive">{actionError}</p>}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-1.5">
            {/* Finance review â€” only when submitted */}
            {detail.status === "submitted" && (
              <>
                <button
                  onClick={() => mutate(() => financeApproveProfileRevision(vendor.id, detail.id))}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-green-500/10 text-green-700 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                >Finance Approve</button>
                <button
                  onClick={() => mutate(() => financeRejectProfileRevision(vendor.id, detail.id, noteInput))}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-red-500/10 text-red-700 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >Finance Reject</button>
              </>
            )}
            {/* Post-finance review â€” finance_approved can only apply */}
            {detail.status === "finance_approved" && (
              <button
                onClick={() => mutate(() => applyProfileRevision(vendor.id, detail.id))}
                className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              >Apply</button>
            )}
            {detail.status === "finance_rejected" && (
              <button
                onClick={() => mutate(() => reopenProfileRevision(vendor.id, detail.id, noteInput))}
                className="text-[11px] px-2.5 py-1 rounded-md bg-orange-500/10 text-orange-700 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
              >Reopen</button>
            )}
            {/* Cancel â€” available from any non-terminal state */}
            {!["applied", "cancelled"].includes(detail.status) && (
              <button
                onClick={() => mutate(() => cancelProfileRevision(vendor.id, detail.id))}
                className="text-[11px] px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors"
              >Cancel</button>
            )}
          </div>

          {/* Note input â€” shown when actions that use notes are available */}
          {["submitted", "finance_rejected"].includes(detail.status) && (
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">
                {detail.status === "submitted" ? "Note (optional, for rejection)" : "Note (optional, for reopen)"}
              </label>
              <input
                type="text"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                placeholder="Optional note..."
                className="w-full text-xs px-2 py-1.5 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function VendorsTab({
  orgId,
  setOrgId,
}: {
  orgId: string | null;
  setOrgId: (id: string | null) => void;
}) {
  const [opStatus, setOpStatus] = useState<string>("all");
  const [mktStatus, setMktStatus] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { data: vendors = [], isLoading } = useVendors({
    org: orgId ?? undefined,
    operational_status: opStatus !== "all" ? opStatus : undefined,
    marketing_status: mktStatus !== "all" ? mktStatus : undefined,
  });

  useEffect(() => {
    if (!orgId && organizations.length === 1 && organizations[0]) {
      setOrgId(organizations[0].id);
    }
  }, [orgId, organizations]);

  const selected = vendors.find((v) => v.id === selectedId);

  const MKT_COLORS: Record<MarketingStatus, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    approved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  const OP_COLORS: Record<string, string> = {
    inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    waiting_marketing_approval: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    suspended: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
      {/* List */}
      <div className="flex w-full md:w-96 flex-col border-b border-border md:border-b-0 md:border-r max-h-[45vh] md:max-h-none">
        <div className="border-b border-border p-3 space-y-2">
          {orgsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <Select value={orgId ?? ""} onValueChange={(v) => { setOrgId(v); setSelectedId(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select org" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name} ({o.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-1">
            <Select value={opStatus} onValueChange={setOpStatus}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Op status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Op: All</SelectItem>
                {Object.entries(OPERATIONAL_STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mktStatus} onValueChange={setMktStatus}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Mkt status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mkt: All</SelectItem>
                {Object.entries(MARKETING_STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : vendors.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No vendors found
            </div>
          ) : (
            <div className="py-1">
              {vendors.map((v) => (
                <button
                  key={v.id}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                    v.id === selectedId ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedId(v.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.vendor_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{v.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <Badge className={MKT_COLORS[v.marketing_status] ?? ""} variant="outline" title="Marketing status">
                      {MARKETING_STATUS_LABELS[v.marketing_status] ?? v.marketing_status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <ScrollArea className="flex-1">
        {selected ? (
          <div className="p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold">{selected.vendor_name}</h2>
                <p className="text-xs text-muted-foreground font-mono">{selected.id}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={MKT_COLORS[selected.marketing_status] ?? ""} variant="outline">
                  Mkt: {MARKETING_STATUS_LABELS[selected.marketing_status]}
                </Badge>
                <Badge className={OP_COLORS[selected.operational_status] ?? ""} variant="outline">
                  Op: {OPERATIONAL_STATUS_LABELS[selected.operational_status]}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Email", value: selected.email },
                { label: "Phone", value: selected.phone },
                { label: "SAP Vendor ID", value: selected.sap_vendor_id ?? "â€”" },
                { label: "PO Mandate", value: selected.po_mandate_enabled ? "Enabled" : "Disabled" },
                { label: "Scope Node", value: selected.scope_node_name },
                { label: "Marketing", value: MARKETING_STATUS_LABELS[selected.marketing_status] },
                { label: "Operational", value: OPERATIONAL_STATUS_LABELS[selected.operational_status] },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-border bg-secondary/20 p-2.5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Portal Access */}
            {selected.operational_status === "active" && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  Portal Access
                </h3>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {[
                      { label: "Portal Email", value: selected.portal_email || "â€”" },
                      { label: "User ID", value: selected.portal_user_id || "â€”" },
                      { label: "Activated", value: selected.portal_activated ? "Yes" : "No" },
                      { label: "Last Sent", value: selected.portal_activation_sent_at
                        ? new Date(selected.portal_activation_sent_at).toLocaleString()
                        : "Never" },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <span className="text-xs text-muted-foreground">{label}: </span>
                        <span className="text-xs font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1">
                    <ResendActivationButton vendor={selected} />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marketing Actions</h3>
              <div className="flex flex-wrap gap-2">
                {selected.marketing_status === "pending" && (
                  <>
                    <MarketingApproveDialog vendor={selected} />
                    <MarketingRejectDialog vendor={selected} />
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Profile Hold indicator */}
            {selected.profile_change_pending && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 text-xs">
                <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Profile hold active</p>
                  <p className="opacity-80 mt-0.5">{selected.profile_hold_reason}</p>
                </div>
              </div>
            )}

            {/* Profile Revisions */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Profile Revisions
              </h3>
              <VendorRevisionReviewPanel vendor={selected} />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a vendor to view details
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type TabKey = "invitations" | "submissions" | "vendors";

const VendorsPage = () => {
  const [tab, setTab] = useState<TabKey>("invitations");
  const [orgId, setOrgId] = useState<string | null>(null);
  const { data: organizations = [] } = useOrganizations();

  useEffect(() => {
    if (!orgId && organizations.length === 1 && organizations[0]) {
      setOrgId(organizations[0].id);
    }
  }, [orgId, organizations]);

  const tabItems: { key: TabKey; label: string }[] = [
    { key: "invitations", label: "Invitations" },
    { key: "submissions", label: "Submissions" },
    { key: "vendors", label: "Vendors" },
  ];

  return (
    <V2Shell
      title="Vendors"
      titleIcon={<Users className="h-5 w-5 text-muted-foreground" />}
      actions={<CreateInvitationDialog orgId={orgId} />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Tab bar */}
        <div className="border-b border-border px-6 pt-3 bg-background">
          <div className="inline-flex items-center gap-1 rounded-lg border border-orange-200/70 bg-gradient-to-r from-orange-50/80 via-background to-background p-1">
          {tabItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                tab === key
                  ? "border border-orange-200 bg-gradient-to-b from-orange-50 to-white text-orange-600 shadow-sm"
                  : "text-muted-foreground hover:bg-orange-50/70 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
          </div>
        </div>

        {/* Tab content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="min-h-0">
            {tab === "invitations" && <InvitationsTab orgId={orgId} setOrgId={setOrgId} />}
            {tab === "submissions" && <SubmissionsTab orgId={orgId} setOrgId={setOrgId} />}
            {tab === "vendors" && <VendorsTab orgId={orgId} setOrgId={setOrgId} />}
          </div>
        </ScrollArea>
      </div>
    </V2Shell>
  );
};

export default VendorsPage;


