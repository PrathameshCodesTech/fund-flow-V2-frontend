/**
 * VendorFinanceActionPage — unified finance review page (token-based, public).
 *
 * Route: /vendor/finance/:token
 *
 * The finance reviewer lands here from the single "Review Vendor" link in the
 * handoff email. The URL token is always the APPROVE token. The page:
 *   1. Loads full submission details via GET /api/v1/vendors/public/finance/{token}/
 *   2. Shows vendor data, exported Excel info, and supporting attachments
 *   3. Provides inline Approve (SAP ID + optional note) and Reject (reason) forms
 *   4. Approve → POST to /finance/{approveToken}/approve/
 *   5. Reject  → POST to /finance/{rejectToken}/reject/ (from tokenData.reject_token)
 */

import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getFinanceToken,
  financeApprove,
  financeReject,
} from "@/lib/api/v2vendor";
import type { PublicFinanceToken } from "@/lib/types/v2vendor";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  XCircle,
  CheckCircle2,
  FileText,
  Paperclip,
  Building2,
  CreditCard,
  MapPin,
} from "lucide-react";

function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.errors["detail"]?.[0] ?? err.message ?? "An error occurred";
  }
  if (err instanceof Error) return err.message;
  return "An error occurred";
}

function InvalidTokenScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-sm w-full text-center">
        <CardContent className="pt-6">
          <XCircle className="w-14 h-14 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid Link</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SuccessScreen({
  kind,
  vendorName,
  sapVendorId,
  note,
}: {
  kind: "approved" | "rejected";
  vendorName: string;
  sapVendorId?: string;
  note?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8">
          {kind === "approved" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">Vendor Approved</h1>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>{vendorName}</strong> has been approved. The submission has moved to
                marketing review and the vendor will be notified.
              </p>
              {sapVendorId && (
                <div className="p-4 rounded-lg bg-secondary/30 text-left text-sm text-muted-foreground space-y-1">
                  <p>SAP Vendor ID: <strong>{sapVendorId}</strong></p>
                  {note && <p>Note: {note}</p>}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">Submission Rejected</h1>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>{vendorName}</strong> has been rejected. The vendor will be notified
                and the submission can be reopened if needed.
              </p>
              {note && (
                <div className="p-4 rounded-lg bg-secondary/30 text-left text-sm text-muted-foreground">
                  <p>Reason: {note}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right">{value}</span>
    </div>
  );
}

function ReviewPage({
  approveToken,
  rejectToken,
  data,
  initialAction,
}: {
  approveToken: string;
  rejectToken: string | null;
  data: PublicFinanceToken;
  initialAction: "approve" | "reject" | null;
}) {
  const [action, setAction] = useState<"approve" | "reject" | null>(initialAction);
  const [sapVendorId, setSapVendorId] = useState("");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const approveMutation = useMutation({
    mutationFn: (payload: { sap_vendor_id: string; note?: string }) =>
      financeApprove(approveToken, payload),
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: { note?: string }) =>
      financeReject(rejectToken!, payload),
  });

  const vendorName = data.vendor_name ?? "Unknown Vendor";

  if (approveMutation.isSuccess) {
    return <SuccessScreen kind="approved" vendorName={vendorName} sapVendorId={sapVendorId} note={note} />;
  }
  if (rejectMutation.isSuccess) {
    return <SuccessScreen kind="rejected" vendorName={vendorName} note={note} />;
  }

  const handleApprove = () => {
    if (!sapVendorId.trim()) {
      setLocalError("SAP Vendor ID is required");
      return;
    }
    setLocalError(null);
    approveMutation.mutate(
      { sap_vendor_id: sapVendorId.trim(), note: note.trim() || undefined },
      { onError: (err) => setLocalError(apiErrorMessage(err)) },
    );
  };

  const handleReject = () => {
    if (!note.trim()) {
      setLocalError("A rejection reason is required");
      return;
    }
    setLocalError(null);
    rejectMutation.mutate(
      { note: note.trim() },
      { onError: (err) => setLocalError(apiErrorMessage(err)) },
    );
  };

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendor Finance Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submission #{data.submission_id} · {vendorName}
          </p>
        </div>

        {/* Company info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <DetailRow label="Vendor Name" value={data.vendor_name} />
            <DetailRow label="Vendor Type" value={data.vendor_type} />
            <DetailRow label="Email" value={data.vendor_email} />
            <DetailRow label="Phone" value={data.vendor_phone} />
            <DetailRow label="GSTIN" value={data.gstin} />
            <DetailRow label="PAN" value={data.pan} />
          </CardContent>
        </Card>

        {/* Address */}
        {(data.address_line1 || data.city) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <DetailRow label="Line 1" value={data.address_line1} />
              <DetailRow label="Line 2" value={data.address_line2} />
              <DetailRow label="City" value={data.city} />
              <DetailRow label="State" value={data.state} />
              <DetailRow label="Country" value={data.country} />
              <DetailRow label="Pincode" value={data.pincode} />
            </CardContent>
          </Card>
        )}

        {/* Bank details */}
        {(data.bank_name || data.account_number) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <DetailRow label="Bank Name" value={data.bank_name} />
              <DetailRow label="Account Number" value={data.account_number} />
              <DetailRow label="IFSC Code" value={data.ifsc} />
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        {(data.has_exported_excel || data.has_source_excel || data.attachments.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.has_exported_excel && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-foreground font-medium">VRF Export Workbook</span>
                  <span className="text-xs text-muted-foreground">(also attached to email)</span>
                  {data.exported_excel_download_url && (
                    <a
                      href={data.exported_excel_download_url}
                      className="text-xs text-primary underline ml-auto"
                    >
                      Download
                    </a>
                  )}
                </div>
              )}
              {data.has_source_excel && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-foreground">Original Uploaded Excel</span>
                  {data.source_excel_download_url && (
                    <a
                      href={data.source_excel_download_url}
                      className="text-xs text-primary underline ml-auto"
                    >
                      Download
                    </a>
                  )}
                </div>
              )}
              {data.attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 text-sm">
                  <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{att.title || att.file_name}</span>
                  {att.document_type && (
                    <span className="text-xs text-muted-foreground">({att.document_type})</span>
                  )}
                  {att.download_url && (
                    <a
                      href={att.download_url}
                      className="text-xs text-primary underline ml-auto"
                    >
                      Download
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Decision */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Action selector */}
            {action === null && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="border-green-500/50 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                  onClick={() => { setAction("approve"); setNote(""); setLocalError(null); }}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
                </Button>
                <Button
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/5"
                  onClick={() => { setAction("reject"); setSapVendorId(""); setLocalError(null); }}
                  disabled={!rejectToken}
                  title={!rejectToken ? "Reject token unavailable" : undefined}
                >
                  <XCircle className="mr-1.5 h-4 w-4" /> Reject
                </Button>
              </div>
            )}

            {/* Approve form */}
            {action === "approve" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sap-vendor-id">SAP Vendor ID *</Label>
                  <Input
                    id="sap-vendor-id"
                    value={sapVendorId}
                    onChange={(e) => setSapVendorId(e.target.value)}
                    placeholder="e.g. V-00012345"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="approve-note">Note (optional)</Label>
                  <Input
                    id="approve-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Approval note…"
                  />
                </div>
                {(localError || approveMutation.isError) && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                    {localError ?? apiErrorMessage(approveMutation.error)}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setAction(null); setLocalError(null); }}
                    disabled={isPending}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={isPending}
                    className="flex-1"
                  >
                    {approveMutation.isPending ? (
                      <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Approving…</>
                    ) : (
                      <><CheckCircle2 className="mr-1.5 h-4 w-4" /> Confirm Approval</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Reject form */}
            {action === "reject" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reject-note">Rejection Reason *</Label>
                  <Input
                    id="reject-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Bank account details do not match records…"
                    autoFocus
                  />
                </div>
                {(localError || rejectMutation.isError) && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                    {localError ?? apiErrorMessage(rejectMutation.error)}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setAction(null); setLocalError(null); }}
                    disabled={isPending}
                  >
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isPending}
                    className="flex-1"
                  >
                    {rejectMutation.isPending ? (
                      <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Rejecting…</>
                    ) : (
                      <><XCircle className="mr-1.5 h-4 w-4" /> Confirm Rejection</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VendorFinanceActionPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();

  const { data: tokenData, isLoading, error } = useQuery({
    queryKey: ["v2", "vendor", "finance", "token", token],
    queryFn: () => getFinanceToken(token!),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading review…</p>
        </div>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <InvalidTokenScreen
        message={
          error instanceof ApiError
            ? error.message
            : "This finance review link is invalid or has expired."
        }
      />
    );
  }

  if (tokenData.is_expired) {
    return <InvalidTokenScreen message="This finance review link has expired. Please contact the system administrator." />;
  }

  if (tokenData.is_used) {
    return <InvalidTokenScreen message="This finance review has already been completed." />;
  }

  // Finance review pages always load via the APPROVE token.
  // Reject-token direct links are not supported — both email buttons use the approve token.
  if (tokenData.action_type !== "approve") {
    return (
      <InvalidTokenScreen message="This link is not a valid review entry point. Please use the link from your finance review email." />
    );
  }

  const approveToken = token!;
  const rejectToken = tokenData.reject_token;

  // ?action=approve or ?action=reject pre-selects the decision form (set by email buttons)
  const actionParam = searchParams.get("action");
  const initialAction: "approve" | "reject" | null =
    actionParam === "approve" ? "approve"
    : actionParam === "reject" ? "reject"
    : null;

  return (
    <ReviewPage
      approveToken={approveToken}
      rejectToken={rejectToken}
      data={tokenData}
      initialAction={initialAction}
    />
  );
}
