import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FinanceShell } from "@/components/v2/FinanceShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Download,
  MoreHorizontal,
  RefreshCw,
  Link,
  CheckCircle,
  ShieldAlert,
  Edit,
  Play,
  Search,
} from "lucide-react";
import {
  DocumentStatusBadge,
  DocumentTypeBadge,
  MatchStatusBadge,
  QuarantineDialog,
  LinkInvoiceDialog,
  ApplyPaymentDialog,
  CorrectionForm,
  DocumentTimeline,
} from "@/components/document-ingestion";
import {
  useDocumentImport,
  useDownloadDocument,
  useProcessDocument,
  useMatchDocument,
} from "@/lib/hooks/useDocumentIngestion";
import type { ExternalDocumentRecord } from "@/lib/types/documentIngestion";
import { toast } from "sonner";

export default function DocumentIngestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const documentId = id ? parseInt(id, 10) : null;

  const [activeTab, setActiveTab] = useState("records");
  const [quarantineDialogOpen, setQuarantineDialogOpen] = useState(false);
  const [linkDialogRecord, setLinkDialogRecord] = useState<ExternalDocumentRecord | null>(null);
  const [applyPaymentRecord, setApplyPaymentRecord] = useState<ExternalDocumentRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<ExternalDocumentRecord | null>(null);

  const { data: document, isLoading, refetch } = useDocumentImport(documentId);
  const downloadMutation = useDownloadDocument();
  const processMutation = useProcessDocument();
  const matchMutation = useMatchDocument();

  // Events are included in document detail response
  const events = document?.events ?? [];
  const records = document?.records ?? [];

  const handleBack = () => {
    navigate("/finance/document-ingestion");
  };

  const handleDownload = () => {
    if (document?.download_url && document?.original_filename) {
      downloadMutation.mutate({
        downloadUrl: document.download_url,
        filename: document.original_filename,
      });
    }
  };

  const handleProcess = async () => {
    if (!documentId) return;
    try {
      await processMutation.mutateAsync({ id: documentId });
      toast.success("Document processing started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process document");
    }
  };

  const handleMatch = async () => {
    if (!documentId) return;
    try {
      await matchMutation.mutateAsync(documentId);
      toast.success("Document matching started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to match document");
    }
  };

  const formatCurrency = (amount: string | undefined, currency: string | undefined): string => {
    if (!amount) return "-";
    const num = parseFloat(amount);
    if (isNaN(num)) return `${currency || "INR"} ${amount}`;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const canProcess = document?.status === "downloaded" || document?.status === "failed";
  const canMatch = document?.status === "extracted" || document?.status === "review_required";
  const canQuarantine =
    document?.status !== "quarantined" &&
    document?.status !== "applied" &&
    document?.status !== "duplicate";

  // Check if a record can have payment applied
  const canApplyPayment = (record: ExternalDocumentRecord): boolean => {
    return (
      record.document_type === "payment_advice" &&
      record.match_status === "matched" &&
      record.applied_payment === null
    );
  };

  if (isLoading) {
    return (
      <FinanceShell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </FinanceShell>
    );
  }

  if (!document || !documentId) {
    return (
      <FinanceShell>
        <div className="text-center py-12">
          <p className="text-gray-500">Document not found</p>
          <Button variant="link" onClick={handleBack} className="mt-2">
            Back to Queue
          </Button>
        </div>
      </FinanceShell>
    );
  }

  return (
    <FinanceShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-semibold truncate max-w-lg" title={document.original_filename}>
                {document.original_filename}
              </h1>
            </div>
            <div className="flex items-center gap-3 ml-11">
              <DocumentStatusBadge status={document.status} />
              <DocumentTypeBadge type={document.document_type} />
              <span className="text-sm text-gray-500">
                {document.org_name}
                {document.source_name && ` - ${document.source_name}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloadMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            {canProcess && (
              <Button
                size="sm"
                onClick={handleProcess}
                disabled={processMutation.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                {processMutation.isPending ? "Processing..." : "Process"}
              </Button>
            )}
            {canMatch && (
              <Button
                size="sm"
                onClick={handleMatch}
                disabled={matchMutation.isPending}
              >
                <Search className="h-4 w-4 mr-2" />
                {matchMutation.isPending ? "Matching..." : "Match"}
              </Button>
            )}
            {canQuarantine && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setQuarantineDialogOpen(true)}
              >
                <ShieldAlert className="h-4 w-4 mr-2" />
                Quarantine
              </Button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {document.last_error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-3">
              <p className="text-sm text-red-700">{document.last_error}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="records">Records ({records.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline ({events.length})</TabsTrigger>
            {editingRecord && <TabsTrigger value="edit">Edit Record</TabsTrigger>}
          </TabsList>

          {/* Records Tab */}
          <TabsContent value="records" className="mt-4">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Invoice/Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                        No records extracted
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => {
                      const nd = record.normalized_data;
                      return (
                        <TableRow key={record.id}>
                          {/* record_index starts at 1, display directly */}
                          <TableCell>{record.record_index}</TableCell>
                          <TableCell>
                            <DocumentTypeBadge type={record.document_type} />
                          </TableCell>
                          <TableCell>
                            <MatchStatusBadge status={record.match_status} />
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              {record.vendor_name ? (
                                <span className="text-green-700 font-medium">
                                  {record.vendor_name}
                                </span>
                              ) : (
                                <span className="text-gray-500">
                                  {nd?.vendor_name || nd?.vendor_code || "-"}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              {record.invoice_title ? (
                                <span className="text-green-700 font-medium truncate block">
                                  {record.invoice_title}
                                </span>
                              ) : (
                                <span className="text-gray-500">
                                  {nd?.invoice_number || nd?.sap_document_number || nd?.payment_reference_number || "-"}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(nd?.amount, nd?.currency)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingRecord(record);
                                    setActiveTab("edit");
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Fields
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setLinkDialogRecord(record)}
                                >
                                  <Link className="h-4 w-4 mr-2" />
                                  Link Invoice
                                </DropdownMenuItem>
                                {canApplyPayment(record) && (
                                  <DropdownMenuItem
                                    onClick={() => setApplyPaymentRecord(record)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Apply Payment
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Validation Errors */}
            {records.some((r) => r.validation_errors && r.validation_errors.length > 0) && (
              <Card className="mt-4 border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-amber-800">Validation Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-amber-700">
                    {records
                      .filter((r) => r.validation_errors && r.validation_errors.length > 0)
                      .map((r) =>
                        r.validation_errors!.map((err, i) => (
                          <li key={`${r.id}-${i}`}>
                            Record {r.record_index}: {err}
                          </li>
                        )),
                      )}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Processing Timeline</CardTitle>
                <CardDescription>History of events for this document</CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentTimeline events={events} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Edit Record Tab */}
          {editingRecord && (
            <TabsContent value="edit" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Edit Record #{editingRecord.record_index}
                      </CardTitle>
                      <CardDescription>
                        Correct extracted fields for this record
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRecord(null);
                        setActiveTab("records");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <CorrectionForm
                    record={editingRecord}
                    documentId={documentId}
                    onSuccess={() => {
                      setEditingRecord(null);
                      setActiveTab("records");
                      refetch();
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Dialogs */}
      <QuarantineDialog
        open={quarantineDialogOpen}
        onOpenChange={setQuarantineDialogOpen}
        documentId={document.id}
        documentName={document.original_filename}
      />

      {linkDialogRecord && (
        <LinkInvoiceDialog
          open={!!linkDialogRecord}
          onOpenChange={(open) => !open && setLinkDialogRecord(null)}
          recordId={linkDialogRecord.id}
          documentId={documentId}
          recordDescription={
            linkDialogRecord.normalized_data?.invoice_number ||
            linkDialogRecord.normalized_data?.vendor_name ||
            undefined
          }
        />
      )}

      {applyPaymentRecord && (
        <ApplyPaymentDialog
          open={!!applyPaymentRecord}
          onOpenChange={(open) => !open && setApplyPaymentRecord(null)}
          record={applyPaymentRecord}
          documentId={documentId}
        />
      )}
    </FinanceShell>
  );
}
