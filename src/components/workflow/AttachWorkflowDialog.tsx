import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Link, Loader2 } from "lucide-react";
import { useWorkflowTemplates, useTemplateVersions } from "@/lib/hooks/useWorkflowConfig";
import { useAttachWorkflow } from "@/lib/hooks/useInvoices";
import { useQuery } from "@tanstack/react-query";
import { listVendorPortalUsers } from "@/lib/api/vendors";
import { extractErrorMessage } from "@/lib/utils/toast-error";
import type { InvoiceDetail } from "@/lib/types/invoices";

interface AttachWorkflowDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceDetail;
  onSuccess?: () => void;
}

export function AttachWorkflowDialog({
  open,
  onClose,
  invoice,
  onSuccess,
}: AttachWorkflowDialogProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [selectedVendorUserId, setSelectedVendorUserId] = useState<string>("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { attachWorkflow, isAttaching } = useAttachWorkflow();

  // Load all manual-link templates for this org
  const { data: templatesData, isLoading: templatesLoading } = useWorkflowTemplates(
    open ? { organization: invoice.organization.id } : undefined,
  );

  const manualLinkTemplates = (templatesData?.results ?? []).filter(
    (t) =>
      t.workflow_mode === "manual_link" &&
      (t.module_name?.toLowerCase() === "invoices" || t.module === "invoices"),
  );

  // Load published versions for the selected template
  const { data: versionsData, isLoading: versionsLoading } = useTemplateVersions(
    selectedTemplateId || null,
    { state: "published" },
  );

  const publishedVersions = versionsData?.results ?? [];

  // Load portal users bound to the invoice's vendor
  const vendorId = invoice.vendor?.id ?? "";
  const { data: portalUsers = [], isLoading: portalUsersLoading } = useQuery({
    queryKey: ["vendorPortalUsers", vendorId],
    queryFn: () => listVendorPortalUsers(vendorId),
    enabled: open && !!vendorId,
  });

  const handleOpenChange = (o: boolean) => {
    if (!o && !isAttaching) {
      setSelectedTemplateId("");
      setSelectedVersionId("");
      setSelectedVendorUserId("");
      setComment("");
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const handleTemplateChange = (value: string) => {
    setSelectedTemplateId(value);
    setSelectedVersionId("");
    setError(null);
  };

  const handleConfirm = async () => {
    if (!selectedVersionId) {
      setError("Select a published version to attach.");
      return;
    }
    if (!selectedVendorUserId) {
      setError("Select a vendor participant.");
      return;
    }
    setError(null);
    try {
      await attachWorkflow({
        invoiceId: invoice.id,
        templateVersionId: selectedVersionId,
        vendorUserId: selectedVendorUserId,
        comment: comment.trim() || undefined,
      });
      setSuccess(true);
      onSuccess?.();
      setTimeout(() => handleOpenChange(false), 1200);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to attach workflow."));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            Attach Workflow
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium text-green-700">
              Workflow attached. Invoice is now in Marketing Review.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Already-attached info */}
            {invoice.attached_workflow_version && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Currently attached</p>
                <p className="font-medium">{invoice.attached_workflow_version.template_name}</p>
                <p className="text-xs text-muted-foreground">
                  v{invoice.attached_workflow_version.version_number} ·{" "}
                  {invoice.attached_workflow_version.has_vendor_return_node
                    ? "Supports return to vendor"
                    : "No vendor return node"}
                </p>
              </div>
            )}

            {/* Template selector */}
            <div className="space-y-1">
              <Label>Workflow Template *</Label>
              {templatesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading templates…
                </div>
              ) : manualLinkTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No manual-link workflow templates found for this organization.
                </p>
              ) : (
                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {manualLinkTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div>
                          <p className="font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.code}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Version selector */}
            {selectedTemplateId && (
              <div className="space-y-1">
                <Label>Version *</Label>
                {versionsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading versions…
                  </div>
                ) : publishedVersions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No published versions for this template. Publish a version first.
                  </p>
                ) : (
                  <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a published version…" />
                    </SelectTrigger>
                    <SelectContent>
                      {publishedVersions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          <div>
                            <p className="font-medium">v{v.version_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {v.has_vendor_return_node
                                ? "Supports return to vendor"
                                : "No vendor return node"}
                              {v.published_at
                                ? ` · Published ${new Date(v.published_at).toLocaleDateString()}`
                                : ""}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Vendor participant selector */}
            <div className="space-y-1">
              <Label>Vendor Participant *</Label>
              {portalUsersLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading portal users…
                </div>
              ) : portalUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No portal users found for this vendor. Add a UserVendorAssignment first.
                </p>
              ) : (
                <Select value={selectedVendorUserId} onValueChange={setSelectedVendorUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor participant…" />
                  </SelectTrigger>
                  <SelectContent>
                    {portalUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div>
                          <p className="font-medium">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Optional comment */}
            <div className="space-y-1">
              <Label>
                Note <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                placeholder="Why is this workflow being attached? (audit trail)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isAttaching}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                isAttaching ||
                !selectedVersionId ||
                !selectedVendorUserId ||
                manualLinkTemplates.length === 0
              }
            >
              {isAttaching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Attaching…
                </>
              ) : (
                "Attach Workflow"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
