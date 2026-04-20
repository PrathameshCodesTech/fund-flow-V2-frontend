import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { financeApprove, financeReject, getPublicFinanceToken } from "@/lib/api/v2finance";
import type { PublicFinanceToken } from "@/lib/types/v2finance";
import {
  InvoiceFinanceHandoff,
  InvoiceFinanceData,
  InvoiceFinanceVendor,
  InvoiceFinanceDocument,
  InvoiceFinanceAllocation,
  InvoiceFinanceWorkflow,
  InvoiceFinanceTimelineEvent,
} from "@/lib/types/v2finance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, XCircle, Loader2, FileText, GitBranch,
  Clock, Building2, Download, AlertTriangle, Info,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: string, currency = "INR"): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

function fmtDate(val: string | null): string {
  if (!val) return "—";
  try { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(val)); }
  catch { return val; }
}

function fmtDateTime(val: string | null): string {
  if (!val) return "—";
  try { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(val)); }
  catch { return val; }
}

function StatusBadge({ label, variant = "default" }: { label: string; variant?: "default" | "success" | "danger" | "warning" | "outline" }) {
  const cls = {
    default: "bg-muted text-muted-foreground",
    success: "bg-green-100 text-green-800",
    danger: "bg-red-100 text-red-800",
    warning: "bg-amber-100 text-amber-800",
    outline: "border text-foreground",
  }[variant];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const detail = (err.errors as Record<string, string[]>)?.detail;
    if (Array.isArray(detail)) return detail[0];
    if (typeof detail === "string") return detail;
    return err.message ?? "An error occurred";
  }
  if (err instanceof Error) return err.message;
  return "An error occurred";
}

// ── Message screens ─────────────────────────────────────────────────────────────

function MessageScreen({ title, message, destructive = false }: { title: string; message: string; destructive?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8">
          {destructive
            ? <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            : <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          }
          <h1 className="text-xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Invoice Overview Tab ───────────────────────────────────────────────────────

function OverviewTab({ data }: { data: PublicFinanceToken }) {
  const inv: InvoiceFinanceData | undefined = data.invoice;
  const vendor: InvoiceFinanceVendor | undefined = data.vendor;
  const handoff: InvoiceFinanceHandoff | undefined = data.handoff;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Invoice Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            ["Title", inv?.title ?? "—"],
            ["Amount", inv ? fmt(inv.amount, inv.currency) : "—"],
            ["Status", inv?.status ?? "—"],
            ["PO Number", inv?.po_number ?? "—"],
            ["Vendor Invoice #", inv?.vendor_invoice_number ?? "—"],
            ["Invoice Date", fmtDate(inv?.invoice_date ?? null)],
            ["Due Date", fmtDate(inv?.due_date ?? null)],
            ["Entity", inv?.scope_node_name ?? "—"],
            ["Description", inv?.description ?? "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">{k}</span>
              <span className="font-medium text-right">{v}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Vendor + Handoff sidebar */}
      <div className="space-y-4">
        {vendor && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Vendor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Name", vendor.vendor_name],
                ["Email", vendor.email ?? "—"],
                ["Phone", vendor.phone ?? "—"],
                ["GSTIN", vendor.gstin ?? "—"],
                ["PAN", vendor.pan ?? "—"],
                ["SAP Vendor ID", vendor.sap_vendor_id ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right text-xs">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              Handoff Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Status", handoff?.status ?? data.handoff_status],
              ["Sent At", fmtDateTime(handoff?.sent_at ?? null)],
              ["Finance Ref", handoff?.finance_reference_id ?? "—"],
              ["Recipients", handoff?.recipient_count ? `${handoff.recipient_count} recipient${handoff.recipient_count !== 1 ? "s" : ""}` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium text-right text-xs">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ docs }: { docs: InvoiceFinanceDocument[] }) {
  if (!docs || docs.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No documents available.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{doc.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {doc.document_type} · Uploaded {fmtDate(doc.uploaded_at)}
              </p>
            </div>
          </div>
          {doc.url ? (
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="ml-3 shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Download className="h-3.5 w-3.5" /> View
            </a>
          ) : (
            <span className="text-xs text-muted-foreground ml-3 shrink-0">No file</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Allocations Tab ──────────────────────────────────────────────────────────

function AllocationsTab({ allocs }: { allocs: InvoiceFinanceAllocation[] }) {
  if (!allocs || allocs.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No split allocations for this invoice.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {["Entity", "Amount", "Category", "Subcategory", "Campaign", "Budget", "Approver", "Status", "Note"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allocs.map(a => (
            <tr key={a.id} className="border-b hover:bg-muted/30">
              <td className="px-3 py-2">{a.entity_name ?? "—"}</td>
              <td className="px-3 py-2 font-medium">{fmt(a.amount)}</td>
              <td className="px-3 py-2">{a.category_name ?? "—"}</td>
              <td className="px-3 py-2">{a.subcategory_name ?? "—"}</td>
              <td className="px-3 py-2">{a.campaign_name ?? "—"}</td>
              <td className="px-3 py-2">{a.budget_name ?? "—"}</td>
              <td className="px-3 py-2">{a.selected_approver_email ?? "—"}</td>
              <td className="px-3 py-2"><StatusBadge label={a.status} /></td>
              <td className="px-3 py-2 text-xs text-muted-foreground max-w-[120px] truncate">{a.note ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Workflow Tab ──────────────────────────────────────────────────────────────

function WorkflowTab({ workflow, timeline }: { workflow: InvoiceFinanceWorkflow | undefined; timeline: InvoiceFinanceTimelineEvent[] }) {
  if (!workflow && (!timeline || timeline.length === 0)) {
    return <div className="text-center text-sm text-muted-foreground py-8">No workflow data available.</div>;
  }
  return (
    <div className="space-y-6">
      {workflow?.groups?.map((group) => (
        <div key={group.name} className="space-y-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{group.name}</h3>
            <StatusBadge label={group.status} />
          </div>
          <div className="ml-6 space-y-1.5">
            {group.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border p-2 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{step.name}</p>
                  <p className="text-muted-foreground">{step.assigned_user_email ?? "Unassigned"}</p>
                  {step.note && <p className="text-muted-foreground mt-0.5 italic">"{step.note}"</p>}
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge label={step.status} variant={step.status === "APPROVED" ? "success" : step.status === "REJECTED" ? "danger" : "default"} />
                  {step.acted_at && <p className="text-muted-foreground mt-0.5">{fmtDateTime(step.acted_at)}</p>}
                </div>
              </div>
            ))}
            {group.branches.map((branch, i) => (
              <div key={`br-${i}`} className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 p-2 text-xs ml-4">
                <GitBranch className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Branch: {branch.entity_name ?? "—"}</p>
                  <p className="text-muted-foreground">{branch.assigned_user_email ?? "Unassigned"}</p>
                  {branch.note && <p className="text-muted-foreground mt-0.5 italic">"{branch.note}"</p>}
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge label={branch.status} variant={branch.status === "APPROVED" ? "success" : branch.status === "REJECTED" ? "danger" : "default"} />
                  {branch.acted_at && <p className="text-muted-foreground mt-0.5">{fmtDateTime(branch.acted_at)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {timeline && timeline.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Timeline
          </h3>
          <div className="space-y-1.5">
            {timeline.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">{ev.event_type.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground ml-1">by {ev.actor_email ?? "system"}</span>
                  <span className="text-muted-foreground ml-1">· {fmtDateTime(ev.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Decision Panel ────────────────────────────────────────────────────────────

function DecisionPanel({
  data,
  token,
  onSuccess,
}: {
  data: PublicFinanceToken;
  token: string;
  onSuccess: () => void;
}) {
  const [referenceId, setReferenceId] = useState("");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const isApprove = data.action_type === "approve";

  const approveMutation = useMutation({
    mutationFn: () => financeApprove(token, {
      reference_id: referenceId.trim(),
      note: note.trim() || undefined,
    }),
    onSuccess,
  });
  const rejectMutation = useMutation({
    mutationFn: () => financeReject(token, { note: note.trim() }),
    onSuccess,
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;
  const apiError = approveMutation.error ?? rejectMutation.error;

  const handleSubmit = () => {
    setLocalError(null);
    if (isApprove && !referenceId.trim()) {
      setLocalError("Finance reference ID is required for approval.");
      return;
    }
    if (!isApprove && !note.trim()) {
      setLocalError("Rejection reason is required.");
      return;
    }
    if (isApprove) approveMutation.mutate();
    else rejectMutation.mutate();
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {isApprove
            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
            : <XCircle className="h-4 w-4 text-destructive" />
          }
          {isApprove ? "Finance Approval" : "Finance Rejection"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {isApprove
            ? "Review the details above, then enter your finance reference and confirm."
            : "Provide a rejection reason — this will be shared with the vendor and submitter."
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isApprove && (
          <div className="space-y-1.5">
            <Label htmlFor="ref-id">Finance Reference ID *</Label>
            <Input
              id="ref-id"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. SAP-2025-00123"
              autoFocus
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="note">{isApprove ? "Note (optional)" : "Rejection Reason *"}</Label>
          <textarea
            id="note"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isApprove ? "Optional note for this approval..." : "Explain why this invoice is being rejected..."}
            autoFocus={!isApprove}
          />
        </div>

        {(localError || apiError) && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {localError ?? errorMessage(apiError)}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isPending}
          variant={isApprove ? "default" : "destructive"}
          className="w-full gap-1.5"
        >
          {isPending ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...</>
          ) : isApprove ? (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Confirm Approval</>
          ) : (
            <><XCircle className="h-3.5 w-3.5" /> Confirm Rejection</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FinanceReviewPage() {
  const { token } = useParams<{ token: string }>();

  const tokenQuery = useQuery({
    queryKey: ["v2", "finance", "public", token],
    queryFn: () => getPublicFinanceToken(token!),
    enabled: !!token,
    retry: false,
  });

  if (tokenQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading finance review...
        </div>
      </div>
    );
  }

  if (tokenQuery.isError || !tokenQuery.data) {
    return <MessageScreen title="Invalid Link" message={errorMessage(tokenQuery.error)} destructive />;
  }

  const data = tokenQuery.data;

  if (data.is_expired) {
    return <MessageScreen title="Link Expired" message="This finance review link has expired. Please request a new email." destructive />;
  }
  if (data.is_used) {
    return <MessageScreen title="Already Completed" message="This finance review link has already been used." destructive />;
  }

  const isApprove = data.action_type === "approve";
  const isInvoice = data.module === "invoice";
  const inv = data.invoice;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-bold text-foreground">Finance Review</h1>
                <StatusBadge
                  label={isApprove ? "Awaiting Approval" : "Awaiting Rejection"}
                  variant={isApprove ? "warning" : "danger"}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {data.subject_name}
                {inv && <span className="ml-2 text-foreground font-medium">{fmt(inv.amount, inv.currency)}</span>}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-foreground">{isInvoice && inv ? fmt(inv.amount, inv.currency) : data.subject_name}</p>
              {isInvoice && inv && <p className="text-xs text-muted-foreground">{inv.title}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-col-reverse lg:flex-row gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {isInvoice && data.invoice ? (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="documents">
                    Documents{data.documents?.length ? ` (${data.documents.length})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="allocations">
                    Allocations{data.allocations?.length ? ` (${data.allocations.length})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="workflow">Workflow</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <OverviewTab data={data} />
                </TabsContent>
                <TabsContent value="documents">
                  <DocumentsTab docs={data.documents ?? []} />
                </TabsContent>
                <TabsContent value="allocations">
                  <AllocationsTab allocs={data.allocations ?? []} />
                </TabsContent>
                <TabsContent value="workflow">
                  <WorkflowTab workflow={data.workflow} timeline={data.timeline ?? []} />
                </TabsContent>
              </Tabs>
            ) : (
              /* Non-invoice: basic info */
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Review Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {[
                    ["Module", data.module],
                    ["Subject", data.subject_name],
                    ["Type", data.subject_type],
                    ["Handoff Status", data.handoff_status],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Decision sidebar */}
          <div className="lg:w-80 shrink-0">
            <DecisionPanel data={data} token={token!} onSuccess={() => {
              tokenQuery.refetch();
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
