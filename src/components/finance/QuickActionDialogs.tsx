import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { approveFinanceHandoff, rejectFinanceHandoff } from "@/lib/api/v2finance";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface QuickApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handoffId: string | number;
  subjectName: string;
  onSuccess?: () => void;
}

export function QuickApproveDialog({
  open,
  onOpenChange,
  handoffId,
  subjectName,
  onSuccess,
}: QuickApproveDialogProps) {
  const [referenceId, setReferenceId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      approveFinanceHandoff(String(handoffId), {
        reference_id: referenceId.trim(),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Invoice approved successfully");
      queryClient.invalidateQueries({ queryKey: ["finance", "handoffs"] });
      onOpenChange(false);
      setReferenceId("");
      setNote("");
      setError(null);
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to approve");
    },
  });

  const handleSubmit = () => {
    setError(null);
    if (!referenceId.trim()) {
      setError("Finance reference ID is required");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Approve Invoice
          </DialogTitle>
          <DialogDescription>
            Approve <strong>{subjectName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ref-id">Finance Reference ID *</Label>
            <Input
              id="ref-id"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. SAP-2025-00123"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <textarea
              id="note"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note..."
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending} className="gap-1.5">
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Approve
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface QuickRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handoffId: string | number;
  subjectName: string;
  onSuccess?: () => void;
}

export function QuickRejectDialog({
  open,
  onOpenChange,
  handoffId,
  subjectName,
  onSuccess,
}: QuickRejectDialogProps) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => rejectFinanceHandoff(String(handoffId), { note: note.trim() }),
    onSuccess: () => {
      toast.success("Invoice rejected");
      queryClient.invalidateQueries({ queryKey: ["finance", "handoffs"] });
      onOpenChange(false);
      setNote("");
      setError(null);
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to reject");
    },
  });

  const handleSubmit = () => {
    setError(null);
    if (!note.trim()) {
      setError("Rejection reason is required");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Reject Invoice
          </DialogTitle>
          <DialogDescription>
            Reject <strong>{subjectName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Rejection Reason *</Label>
            <textarea
              id="reason"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain why this invoice is being rejected..."
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={mutation.isPending} className="gap-1.5">
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Rejecting...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" /> Reject
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
