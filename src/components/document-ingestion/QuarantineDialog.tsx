import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuarantineDocument } from "@/lib/hooks/useDocumentIngestion";
import { toast } from "sonner";

interface QuarantineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: number;
  documentName: string;
}

export function QuarantineDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
}: QuarantineDialogProps) {
  const [reason, setReason] = useState("");
  const quarantineMutation = useQuarantineDocument();

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for quarantining");
      return;
    }

    try {
      await quarantineMutation.mutateAsync({
        id: documentId,
        data: { reason: reason.trim() },
      });
      toast.success("Document quarantined successfully");
      onOpenChange(false);
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to quarantine document");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setReason("");
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Quarantine Document</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to quarantine "{documentName}"? This will prevent further
            processing of this document.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="reason">Reason for Quarantine</Label>
          <Textarea
            id="reason"
            placeholder="Enter the reason for quarantining this document..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!reason.trim() || quarantineMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {quarantineMutation.isPending ? "Quarantining..." : "Quarantine"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
