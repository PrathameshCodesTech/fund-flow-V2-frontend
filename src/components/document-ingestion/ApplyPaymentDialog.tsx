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
import { Card, CardContent } from "@/components/ui/card";
import { useApplyPaymentRecord } from "@/lib/hooks/useDocumentIngestion";
import type { ExternalDocumentRecord } from "@/lib/types/documentIngestion";
import { toast } from "sonner";

interface ApplyPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ExternalDocumentRecord;
  documentId: number;
}

export function ApplyPaymentDialog({
  open,
  onOpenChange,
  record,
  documentId,
}: ApplyPaymentDialogProps) {
  const applyMutation = useApplyPaymentRecord();

  const handleConfirm = async () => {
    try {
      await applyMutation.mutateAsync({
        id: record.id,
        documentId,
      });
      toast.success("Payment applied successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply payment");
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

  const nd = record.normalized_data;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Apply Payment</AlertDialogTitle>
          <AlertDialogDescription>
            Review the payment details before applying to the matched invoice.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Card className="border-0 shadow-none bg-gray-50">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="text-gray-500">Vendor</div>
              <div className="font-medium">{record.vendor_name || nd?.vendor_name || "-"}</div>

              <div className="text-gray-500">Invoice</div>
              <div className="font-medium">{record.invoice_title || "-"}</div>

              <div className="text-gray-500">Amount</div>
              <div className="font-medium">{formatCurrency(nd?.amount, nd?.currency)}</div>

              <div className="text-gray-500">Currency</div>
              <div className="font-medium">{nd?.currency || "INR"}</div>

              <div className="text-gray-500">Payment Date</div>
              <div className="font-medium">{nd?.payment_date || "-"}</div>

              <div className="text-gray-500">UTR/Reference</div>
              <div className="font-medium">
                {nd?.utr_number || nd?.payment_reference_number || "-"}
              </div>
            </div>
          </CardContent>
        </Card>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={applyMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {applyMutation.isPending ? "Applying..." : "Apply Payment"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
