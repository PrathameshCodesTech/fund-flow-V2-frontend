import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  PencilLine,
  Upload,
  XCircle,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ApiError } from "@/lib/api/client";
import { downloadBudgetRevisionTemplate } from "@/lib/api/v2budget";
import {
  useBudget,
  useBudgetRevision,
  useBudgetRevisions,
  useCancelBudgetRevision,
  useCreateExcelBudgetRevision,
  useCreateManualBudgetRevision,
  usePublishBudgetRevision,
} from "@/lib/hooks/useV2Budget";
import type { Budget, BudgetRevisionStatus } from "@/lib/types/v2budget";
import { cn } from "@/lib/utils";

type ManualAmounts = Record<string, string>;

const STATUS_LABELS: Record<BudgetRevisionStatus, string> = {
  draft: "Draft",
  validated: "Ready to publish",
  published: "Published",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<BudgetRevisionStatus, string> = {
  draft: "border-amber-300 bg-amber-50 text-amber-800",
  validated: "border-blue-300 bg-blue-50 text-blue-800",
  published: "border-emerald-300 bg-emerald-50 text-emerald-800",
  rejected: "border-red-300 bg-red-50 text-red-800",
  cancelled: "border-border bg-muted text-muted-foreground",
};

function errorMessage(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : "The request could not be completed.";
}

function formatMoney(value: string | number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function BudgetRevisionPanel({ budgets, canManage }: { budgets: Budget[]; canManage: boolean }) {
  const [budgetId, setBudgetId] = useState<string | null>(budgets[0]?.id ?? null);
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [manualAmounts, setManualAmounts] = useState<ManualAmounts>({});
  const [file, setFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!budgets.length) {
      setBudgetId(null);
      return;
    }
    if (budgetId && budgets.some((budget) => budget.id === budgetId)) return;
    setBudgetId(budgets[0].id);
  }, [budgetId, budgets]);

  const selectedBudget = budgets.find((budget) => budget.id === budgetId) ?? null;
  const { data: budgetDetail, isLoading: budgetLoading } = useBudget(budgetId);
  const { data: revisions = [], isLoading: revisionsLoading } = useBudgetRevisions(budgetId);
  const { data: selectedRevision, isLoading: revisionLoading } = useBudgetRevision(revisionId);
  const createManual = useCreateManualBudgetRevision();
  const createExcel = useCreateExcelBudgetRevision();
  const publishRevision = usePublishBudgetRevision();
  const cancelRevision = useCancelBudgetRevision();

  useEffect(() => {
    setRevisionId(null);
    setChangeReason("");
    setFile(null);
  }, [budgetId]);

  useEffect(() => {
    const amounts: ManualAmounts = {};
    for (const line of budgetDetail?.lines ?? []) amounts[line.id] = line.allocated_amount;
    setManualAmounts(amounts);
  }, [budgetDetail]);

  const manualTotal = useMemo(
    () => Object.values(manualAmounts).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [manualAmounts],
  );
  const changedLines = selectedRevision?.lines.filter((line) => line.change_type !== "unchanged") ?? [];
  const isActionable = selectedRevision?.status === "draft" || selectedRevision?.status === "validated";
  const busy = createManual.isPending || createExcel.isPending || publishRevision.isPending || cancelRevision.isPending;

  const resetForm = () => {
    setChangeReason("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleManualPreview = async () => {
    if (!budgetId || !budgetDetail?.lines?.length || !changeReason.trim()) return;
    try {
      const revision = await createManual.mutateAsync({
        budget: budgetId,
        change_reason: changeReason.trim(),
        lines: budgetDetail.lines.map((line) => ({
          category: line.category,
          subcategory: line.subcategory,
          allocated_amount: manualAmounts[line.id] || "0",
        })),
      });
      setRevisionId(revision.id);
      resetForm();
      toast({ title: "Revision created", description: "Review the proposed changes before publishing." });
    } catch (error) {
      toast({ variant: "destructive", title: "Could not create revision", description: errorMessage(error) });
    }
  };

  const handleExcelPreview = async () => {
    if (!budgetId || !file || !changeReason.trim()) return;
    try {
      const revision = await createExcel.mutateAsync({ budget: budgetId, change_reason: changeReason.trim(), file });
      setRevisionId(revision.id);
      resetForm();
      toast({ title: "Workbook validated", description: "Review the proposed changes before publishing." });
    } catch (error) {
      toast({ variant: "destructive", title: "Workbook validation failed", description: errorMessage(error) });
    }
  };

  const handleDownload = async () => {
    if (!budgetId || !selectedBudget) return;
    setDownloading(true);
    try {
      const blob = await downloadBudgetRevisionTemplate(budgetId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${selectedBudget.code}-allocation-revision.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ variant: "destructive", title: "Template download failed", description: errorMessage(error) });
    } finally {
      setDownloading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedRevision) return;
    try {
      await publishRevision.mutateAsync(selectedRevision.id);
      toast({ title: "Revision published", description: "The live budget allocation has been updated." });
    } catch (error) {
      toast({ variant: "destructive", title: "Publish failed", description: errorMessage(error) });
    }
  };

  const handleCancel = async () => {
    if (!selectedRevision) return;
    try {
      await cancelRevision.mutateAsync(selectedRevision.id);
      toast({ title: "Revision cancelled" });
    } catch (error) {
      toast({ variant: "destructive", title: "Cancel failed", description: errorMessage(error) });
    }
  };

  if (!budgets.length) {
    return <div className="p-8 text-center text-sm text-muted-foreground">No visible budgets are available.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.35fr)]">
        <div className="space-y-2">
          <Label>Budget</Label>
          <Select value={budgetId ?? ""} onValueChange={setBudgetId}>
            <SelectTrigger><SelectValue placeholder="Select one budget" /></SelectTrigger>
            <SelectContent>
              {budgets.map((budget) => (
                <SelectItem key={budget.id} value={budget.id}>
                  {budget.name} ({budget.code}) - {budget.scope_node_name ?? "Scope"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3 border-l border-border pl-4">
          <div><p className="text-xs text-muted-foreground">Current allocation</p><p className="mt-1 font-semibold">{formatMoney(selectedBudget?.allocated_amount ?? 0, selectedBudget?.currency)}</p></div>
          <div><p className="text-xs text-muted-foreground">Revision history</p><p className="mt-1 font-semibold">{revisions.length}</p></div>
        </div>
      </div>

      {canManage ? (
        <section className="border-y border-border py-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Create allocation revision</h3>
            <p className="text-sm text-muted-foreground">Changes remain a preview until explicitly published.</p>
          </div>
          <Tabs defaultValue="manual">
            <TabsList>
              <TabsTrigger value="manual"><PencilLine className="mr-2 h-4 w-4" />Manual</TabsTrigger>
              <TabsTrigger value="excel"><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-4 space-y-4">
              {budgetLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Subcategory</TableHead><TableHead className="w-48 text-right">Current</TableHead><TableHead className="w-56">New allocation</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(budgetDetail?.lines ?? []).map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium">{line.category_name ?? line.category}</TableCell>
                          <TableCell>{line.subcategory_name ?? "Category level"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(line.allocated_amount, selectedBudget?.currency)}</TableCell>
                          <TableCell>
                            <Input type="number" min="0" step="0.01" value={manualAmounts[line.id] ?? ""} onChange={(event) => setManualAmounts((current) => ({ ...current, [line.id]: event.target.value }))} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex justify-end text-sm"><span className="text-muted-foreground">Proposed total:&nbsp;</span><strong>{formatMoney(manualTotal, selectedBudget?.currency)}</strong></div>
              <div className="space-y-2"><Label htmlFor="manual-reason">Change reason *</Label><Textarea id="manual-reason" value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder="State why this allocation is changing" /></div>
              <Button onClick={handleManualPreview} disabled={busy || !changeReason.trim() || !(budgetDetail?.lines?.length)}><CheckCircle2 className="mr-2 h-4 w-4" />Create preview</Button>
            </TabsContent>

            <TabsContent value="excel" className="mt-4 space-y-4">
              <Alert><FileSpreadsheet className="h-4 w-4" /><AlertTitle>One budget per workbook</AlertTitle><AlertDescription>Download this budget's template, change only New Allocation, then upload it for validation.</AlertDescription></Alert>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleDownload} disabled={downloading || !budgetId}>{downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download template</Button>
                <Input ref={fileInputRef} className="max-w-sm" type="file" accept=".xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-2"><Label htmlFor="excel-reason">Change reason *</Label><Textarea id="excel-reason" value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder="State why this allocation is changing" /></div>
              <Button onClick={handleExcelPreview} disabled={busy || !file || !changeReason.trim()}><Upload className="mr-2 h-4 w-4" />Validate and preview</Button>
            </TabsContent>
          </Tabs>
        </section>
      ) : (
        <Alert><History className="h-4 w-4" /><AlertTitle>Revision history</AlertTitle><AlertDescription>You have read-only access to published and pending budget revisions.</AlertDescription></Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section>
          <div className="mb-3 flex items-center gap-2"><History className="h-4 w-4" /><h3 className="font-semibold">History</h3></div>
          <div className="divide-y overflow-hidden rounded-md border">
            {revisionsLoading ? <div className="p-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : revisions.length ? revisions.map((revision) => (
              <button key={revision.id} type="button" onClick={() => setRevisionId(revision.id)} className={cn("block w-full p-4 text-left hover:bg-muted/50", revisionId === revision.id && "bg-muted")}>
                <div className="flex items-center justify-between gap-2"><span className="font-medium">Revision {revision.revision_number}</span><Badge variant="outline" className={STATUS_STYLES[revision.status]}>{STATUS_LABELS[revision.status]}</Badge></div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{revision.change_reason}</p>
                <p className="mt-2 text-xs text-muted-foreground">{revision.source === "excel" ? "Excel upload" : "Manual edit"} - {formatDate(revision.created_at)}</p>
              </button>
            )) : <p className="p-4 text-sm text-muted-foreground">No revisions for this budget.</p>}
          </div>
        </section>

        <section>
          {!revisionId ? (
            <div className="flex min-h-60 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">Create or select a revision to inspect its changes.</div>
          ) : revisionLoading || !selectedRevision ? (
            <div className="flex min-h-60 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><div className="flex items-center gap-2"><h3 className="text-lg font-semibold">Revision {selectedRevision.revision_number}</h3><Badge variant="outline" className={STATUS_STYLES[selectedRevision.status]}>{STATUS_LABELS[selectedRevision.status]}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{selectedRevision.change_reason}</p><p className="mt-1 text-xs text-muted-foreground">Created by {selectedRevision.created_by_email ?? "System"} on {formatDate(selectedRevision.created_at)}</p></div>
                {canManage && isActionable ? <div className="flex gap-2">
                  <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" disabled={busy}><XCircle className="mr-2 h-4 w-4" />Cancel revision</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancel this revision?</AlertDialogTitle><AlertDialogDescription>The live budget is unchanged. This preview will remain in history as cancelled.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep revision</AlertDialogCancel><AlertDialogAction onClick={handleCancel}>Cancel revision</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                  <AlertDialog><AlertDialogTrigger asChild><Button disabled={busy || selectedRevision.status !== "validated"}><CheckCircle2 className="mr-2 h-4 w-4" />Publish</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Publish this allocation revision?</AlertDialogTitle><AlertDialogDescription>This atomically updates the live budget and becomes permanent revision history.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Back</AlertDialogCancel><AlertDialogAction onClick={handlePublish}>Publish revision</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                </div> : null}
              </div>

              {selectedRevision.validation_errors.length ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Validation errors</AlertTitle><AlertDescription><ul className="list-disc pl-4">{selectedRevision.validation_errors.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}</ul></AlertDescription></Alert> : null}

              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>Allocation line</TableHead><TableHead>Change</TableHead><TableHead className="text-right">Previous</TableHead><TableHead className="text-right">Proposed</TableHead><TableHead className="text-right">Difference</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {selectedRevision.lines.map((line) => {
                      const difference = Number(line.proposed_allocated_amount) - Number(line.previous_allocated_amount);
                      return <TableRow key={line.id} className={line.change_type === "unchanged" ? "text-muted-foreground" : undefined}>
                        <TableCell><p className="font-medium">{line.category_name}</p><p className="text-xs text-muted-foreground">{line.subcategory_name ?? "Category level"}</p></TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{line.change_type}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(line.previous_allocated_amount, selectedBudget?.currency)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(line.proposed_allocated_amount, selectedBudget?.currency)}</TableCell>
                        <TableCell className={cn("text-right tabular-nums font-medium", difference > 0 && "text-emerald-700", difference < 0 && "text-red-700")}>{difference > 0 ? "+" : ""}{formatMoney(difference, selectedBudget?.currency)}</TableCell>
                      </TableRow>;
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">{changedLines.length} changed line{changedLines.length === 1 ? "" : "s"} of {selectedRevision.lines.length}. {selectedRevision.published_at ? `Published by ${selectedRevision.published_by_email ?? "System"} on ${formatDate(selectedRevision.published_at)}.` : ""}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
