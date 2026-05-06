import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { useAuth, ROLE_LABELS, UserRole } from "@/contexts/AuthContext";
import { canManageIAM } from "@/lib/capabilities";
import {
  useRegistrations,
  useRegistrationDetail,
  useApproveRegistration,
  useRejectRegistration,
  useCreateInvite,
} from "@/lib/hooks/useVendors";
import { useTenantUsers, useRoleAssignments, useSendAccessEmail } from "@/lib/hooks/useTenantAdmin";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api/client";
import type { VendorRegistrationRequest } from "@/lib/types/vendors";
import {
  Users, ShieldCheck, Activity, Mail,
  CheckCircle2, XCircle, Clock, MessageSquare,
  ArrowRight, AlertTriangle, Loader2, ExternalLink, X,
  ChevronDown, ChevronUp, Landmark, FileText,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
}

function userInitials(name: string): string {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

type AdminTab = "overview" | "vendors" | "users";

// ── Vendor Verification Tab ────────────────────────────────────────────────────

// ── Invite Modal ───────────────────────────────────────────────────────────────

function InviteModal({
  orgId,
  onClose,
}: {
  orgId: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { sendInvite, isSending } = useCreateInvite();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim() || !email.includes("@")) {
      setEmailError("A valid email address is required.");
      return;
    }
    setEmailError("");
    try {
      const result = await sendInvite({ contact_email: email.trim(), contact_name: name.trim(), organization: orgId });
      if (result && "warning" in result && result.warning) {
        toast({
          title: "Invite created — email delivery failed",
          description: result.warning as string,
          variant: "destructive",
        });
      } else {
        setSent(true);
        toast({ title: "Invite sent", description: `Registration link emailed to ${email.trim()}.` });
      }
    } catch (err) {
      toast({
        title: "Failed to send invite",
        description: err instanceof ApiError ? err.message : "Unexpected error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-card-title">Send Registration Invite</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Invite sent to {email}</p>
            <p className="text-caption mt-1">The vendor will receive a registration link valid for 7 days.</p>
            <button
              onClick={onClose}
              className="mt-5 px-6 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-caption">
              Enter the vendor's contact details. A registration link will be emailed immediately.
              The admin does not fill in vendor business details — the vendor completes those themselves.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Contact Email <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                placeholder="vendor@company.com"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Contact Person Name <span className="text-caption">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Ravi Sharma"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={isSending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 shadow-soft disabled:opacity-60"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Invite
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Vendor Card ────────────────────────────────────────────────────────────────

function VendorCard({ req }: { req: VendorRegistrationRequest }) {
  const { toast } = useToast();
  const { approveRegistration, isApproving } = useApproveRegistration();
  const { rejectRegistration, isRejecting } = useRejectRegistration();
  const [rejectingOpen, setRejectingOpen] = useState(false);
  const [approvingOpen, setApprovingOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch full detail (bank accounts, notes) only when the admin expands the card.
  const { data: detail, isLoading: detailLoading } = useRegistrationDetail(
    detailOpen ? req.id : null
  );

  // Backend uses "submitted" (and "under_review") for pending states
  const isReviewable = req.status === "submitted" || req.status === "under_review";
  const isBusy = isApproving || isRejecting;

  const statusColors: Record<string, string> = {
    submitted: "bg-warning/10 text-warning",
    under_review: "bg-info/10 text-info",
    approved: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
    draft: "bg-muted text-muted-foreground",
  };

  const handleApprove = async () => {
    try {
      await approveRegistration({ id: req.id, payload: { comment: approvalComment.trim() } });
      toast({ title: "Vendor approved", description: `${req.vendor_name} has been approved. Notification email sent.` });
      setApprovingOpen(false);
      setApprovalComment("");
    } catch (err) {
      toast({
        title: "Approval failed",
        description: err instanceof ApiError ? err.message : "Unexpected error",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await rejectRegistration({ id: req.id, reason: rejectReason });
      toast({ title: "Registration rejected", description: `${req.vendor_name} has been rejected. Notification email sent.` });
      setRejectingOpen(false);
      setRejectReason("");
    } catch (err) {
      toast({
        title: "Rejection failed",
        description: err instanceof ApiError ? err.message : "Unexpected error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="widget-card">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isReviewable ? "bg-warning/10" :
            req.status === "approved" ? "bg-success/10" : "bg-destructive/10"
          }`}>
            {isReviewable ? <Clock className="w-5 h-5 text-warning" /> :
             req.status === "approved" ? <CheckCircle2 className="w-5 h-5 text-success" /> :
             <XCircle className="w-5 h-5 text-destructive" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{req.vendor_name}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[req.status] ?? "bg-muted text-muted-foreground"}`}>
                {req.status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            </div>
            {req.contact_email && <p className="text-caption">{req.contact_email}</p>}
            <p className="text-caption">Submitted: {formatDate(req.submitted_at)}</p>
          </div>
        </div>
        <div className="text-right text-xs">
          {req.reviewed_at && <p className="text-caption">Reviewed: {formatDate(req.reviewed_at)}</p>}
        </div>
      </div>

      {req.vendor_tax_id && (
        <div className="mt-4 p-3 rounded-xl bg-secondary/30">
          <p className="text-caption mb-1">Tax ID</p>
          <p className="text-sm font-medium text-foreground font-mono">{req.vendor_tax_id}</p>
        </div>
      )}

      {/* Review Details toggle — loads full detail shape on demand */}
      <button
        onClick={() => setDetailOpen(v => !v)}
        className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        {detailOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {detailOpen ? "Hide details" : "Review full details"}
      </button>

      {detailOpen && (
        <div className="mt-3 space-y-3">
          {detailLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </div>
          )}
          {detail && (
            <>
              {/* ── Business Details ────────────────────────────────────────── */}
              <div className="p-3 rounded-xl bg-secondary/30">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Business Details
                </p>
                <div className="space-y-1.5">
                  {[
                    ["Company Name", detail.vendor_name],
                    ["Legal Name", detail.vendor_legal_name],
                    ["Vendor Type", detail.vendor_type ? detail.vendor_type.charAt(0).toUpperCase() + detail.vendor_type.slice(1) : ""],
                    ["Tax ID", detail.vendor_tax_id],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 text-xs">
                      <span className="text-muted-foreground flex-shrink-0">{label}</span>
                      <span className="font-medium text-foreground text-right font-mono break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Contact Details ─────────────────────────────────────────── */}
              <div className="p-3 rounded-xl bg-secondary/30">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Contact Details
                </p>
                <div className="space-y-1.5">
                  {[
                    ["Email", detail.contact_email],
                    ["Phone", detail.contact_phone],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 text-xs">
                      <span className="text-muted-foreground flex-shrink-0">{label}</span>
                      <span className="font-medium text-foreground text-right break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Notes ───────────────────────────────────────────────────── */}
              {detail.notes && (
                <div className="p-3 rounded-xl bg-secondary/30">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes from vendor</p>
                  <p className="text-xs text-foreground whitespace-pre-wrap">{detail.notes}</p>
                </div>
              )}

              {/* ── Bank Accounts ───────────────────────────────────────────── */}
              {detail.bank_accounts && detail.bank_accounts.length > 0 && (
                <div className="p-3 rounded-xl bg-secondary/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Landmark className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Bank Account{detail.bank_accounts.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  {detail.bank_accounts.map(ba => (
                    <div key={ba.id} className={detail.bank_accounts.length > 1 ? "mb-3 pb-3 border-b border-border last:border-0 last:mb-0 last:pb-0" : ""}>
                      <div className="space-y-1">
                        {[
                          ["Account Holder", ba.account_name],
                          ["Bank", ba.bank_name],
                          ["Account Number", ba.account_number],
                          ["IFSC / Routing", ba.routing_number],
                          ["SWIFT", ba.swift_code],
                          ["IBAN", ba.iban],
                          ["Currency", ba.currency],
                          ["Country", ba.country],
                        ].filter(([, v]) => v).map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-4 text-xs">
                            <span className="text-muted-foreground flex-shrink-0">{label}</span>
                            <span className="font-medium text-foreground text-right font-mono break-all">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Documents ───────────────────────────────────────────────── */}
              {detail.documents && detail.documents.length > 0 && (
                <div className="p-3 rounded-xl bg-secondary/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Documents ({detail.documents.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {detail.documents.map(doc => (
                      <div key={doc.id} className="flex items-start justify-between gap-3 text-xs py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{doc.name}</p>
                            <p className="text-caption capitalize">
                              {doc.document_type.replace(/_/g, " ")}
                            </p>
                            {doc.expiry_date && (
                              <p className="text-caption">
                                Expires: {formatDate(doc.expiry_date)}
                              </p>
                            )}
                            {doc.notes && (
                              <p className="text-caption mt-0.5 text-muted-foreground italic">
                                {doc.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        {doc.file && (
                          <a
                            href={typeof doc.file === "string" ? doc.file : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex-shrink-0 text-xs"
                            onClick={e => {
                              if (!doc.file || typeof doc.file !== "string") e.preventDefault();
                            }}
                          >
                            View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!detail.documents || detail.documents.length === 0) && (
                <div className="p-3 rounded-xl bg-secondary/20 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">No documents submitted.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {req.approval_comment && (
        <div className="mt-3 p-3 rounded-xl bg-success/5 border border-success/10 flex items-start gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-success uppercase tracking-wide mb-0.5">Reviewer note</p>
            <p className="text-xs text-muted-foreground">{req.approval_comment}</p>
          </div>
        </div>
      )}

      {req.rejection_reason && (
        <div className="mt-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10 flex items-start gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-destructive uppercase tracking-wide mb-0.5">Rejection reason</p>
            <p className="text-xs text-muted-foreground">{req.rejection_reason}</p>
          </div>
        </div>
      )}

      {isReviewable && (
        <div className="mt-4 pt-4 border-t border-border">
          {rejectingOpen ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-foreground">Rejection reason <span className="text-destructive">*</span></p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Required — explain why this registration is being rejected…"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-destructive/20 focus:border-destructive resize-none h-20"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || isBusy}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40"
                >
                  {isRejecting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Confirm Rejection
                </button>
                <button
                  onClick={() => { setRejectingOpen(false); setRejectReason(""); }}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : approvingOpen ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-foreground">
                Approval comment <span className="text-caption">(optional)</span>
              </p>
              <textarea
                value={approvalComment}
                onChange={e => setApprovalComment(e.target.value)}
                placeholder="Add a note for the vendor, e.g. 'Welcome — portal access will follow shortly'…"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success resize-none h-20"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={isBusy}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success text-success-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40 shadow-soft"
                >
                  {isApproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Confirm Approval
                </button>
                <button
                  onClick={() => { setApprovingOpen(false); setApprovalComment(""); }}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setApprovingOpen(true)}
                disabled={isBusy}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success text-success-foreground text-xs font-medium hover:opacity-90 shadow-soft disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                onClick={() => setRejectingOpen(true)}
                disabled={isBusy}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VendorsTab({ orgId }: { orgId: string | undefined }) {
  const { registrations, isLoading, error } = useRegistrations(
    orgId ? { organization: orgId } : undefined
  );
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="space-y-6">
      {inviteOpen && orgId && (
        <InviteModal orgId={orgId} onClose={() => setInviteOpen(false)} />
      )}

      {/* Send invite */}
      <div className="widget-card">
        <h3 className="text-card-title mb-1">Invite a Vendor</h3>
        <p className="text-caption mb-4">
          Send a registration link directly to the vendor's email. They will complete
          their own business details — you only provide the contact email.
        </p>
        {orgId ? (
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 shadow-soft"
          >
            <Mail className="w-4 h-4" /> Send Registration Invite
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">Organization context unavailable.</p>
        )}
      </div>

      {/* Registration list */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Registration Requests</h3>
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="widget-card flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Failed to load registration requests.</span>
          </div>
        )}
        {!isLoading && !error && registrations.length === 0 && (
          <div className="widget-card text-center py-10 text-muted-foreground">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No registration requests yet.</p>
            <p className="text-caption mt-1">Send an invite above to get started.</p>
          </div>
        )}
        {!isLoading && registrations.map(req => (
          <div key={req.id} className="mb-4">
            <VendorCard req={req} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Users Tab ──────────────────────────────────────────────────────────────────

function UsersTab() {
  const { data: users = [], isLoading: usersLoading, error: usersError } = useTenantUsers();
  const { data: roleAssignments = [], isLoading: rolesLoading } = useRoleAssignments();
  const { mutate: sendAccessEmail, isPending: isSending, variables: sendingId } = useSendAccessEmail();
  const { toast } = useToast();

  const isLoading = usersLoading || rolesLoading;

  function handleSendAccessEmail(userId: string, userEmail: string) {
    sendAccessEmail(userId, {
      onSuccess: () => {
        toast({ title: "Access email sent", description: `Activation link sent to ${userEmail}.` });
      },
      onError: (err: unknown) => {
        toast({
          title: "Failed to send email",
          description: err instanceof ApiError ? err.message : "Unexpected error",
          variant: "destructive",
        });
      },
    });
  }

  // Build map: user_id → role names
  const rolesByUser = roleAssignments.reduce<Record<string, string[]>>((acc, ra) => {
    if (!acc[ra.user_id]) acc[ra.user_id] = [];
    acc[ra.user_id].push(ra.role_name || ra.role_code);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="widget-card flex items-center gap-2 text-destructive">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm">Failed to load users.</span>
      </div>
    );
  }

  return (
    <div className="widget-card p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-card-title">User Management</h2>
        <p className="text-xs text-muted-foreground">
          Create and manage users in{" "}
          <a href="/tenant-admin" className="text-primary hover:underline inline-flex items-center gap-1">
            Tenant Admin <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Users className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">No users found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-6">User</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Email</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Roles</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {users.map((u, i) => {
                const roles = rolesByUser[u.id] ?? [];
                const displayName = u.full_name || [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;
                return (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-secondary/50 transition-colors"
                  >
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-primary">{userInitials(displayName)}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{displayName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-4">
                      {roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {roles.map(r => (
                            <span key={r} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary">
                              {r}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No roles</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {u.is_active ? (
                        <span className="flex items-center gap-1.5 text-xs text-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-success" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {!u.is_active && (
                        <button
                          onClick={() => handleSendAccessEmail(u.id, u.email)}
                          disabled={isSending && sendingId === u.id}
                          title="Send activation email"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/8 text-primary text-xs font-medium hover:bg-primary/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSending && sendingId === u.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                          Send Access Email
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────

function OverviewTab({
  onTabChange,
  pendingCount,
  userCount,
  isLoading,
}: {
  onTabChange: (t: AdminTab) => void;
  pendingCount: number;
  userCount: number;
  isLoading: boolean;
}) {
  const stats = [
    { label: "Total Users", value: isLoading ? "…" : String(userCount), icon: Users },
    { label: "Pending Vendors", value: isLoading ? "…" : String(pendingCount), icon: ShieldCheck },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="widget-card text-center"
          >
            <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-financial">{stat.value}</p>
            <p className="text-caption">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={() => onTabChange("vendors")}
          className="widget-card flex items-center gap-3 hover:border-primary/30 transition-colors group text-left"
        >
          <ShieldCheck className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Vendor Verification</p>
            <p className="text-caption truncate">
              {pendingCount > 0 ? `${pendingCount} pending registration${pendingCount !== 1 ? "s" : ""}` : "No pending registrations"}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Pre-fetch data needed for overview counts
  const { registrations } = useRegistrations(
    user?.organization_id ? { organization: user.organization_id } : undefined
  );
  const { data: users = [], isLoading: usersLoading } = useTenantUsers();

  if (!canManageIAM(user)) {
    return (
      <AppLayout title="Admin" subtitle="System administration">
        <div className="widget-card text-center py-12">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          <p className="text-caption mt-2">
            Current role: {user ? ROLE_LABELS[user.role as UserRole] ?? user.role : "Unknown"}
          </p>
        </div>
      </AppLayout>
    );
  }

  const pendingCount = registrations.filter(r =>
    r.status === "submitted" || r.status === "under_review"
  ).length;

  const tabs: { key: AdminTab; label: string; icon: typeof Users }[] = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "vendors", label: "Vendor Verification", icon: ShieldCheck },
    { key: "users", label: "Users", icon: Users },
  ];

  return (
    <AppLayout title="Admin" subtitle="System administration & configuration">
      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.key === "vendors" && pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          onTabChange={setActiveTab}
          pendingCount={pendingCount}
          userCount={users.length}
          isLoading={usersLoading}
        />
      )}
      {activeTab === "vendors" && <VendorsTab orgId={user?.organization_id ?? undefined} />}
      {activeTab === "users" && <UsersTab />}
    </AppLayout>
  );
}

