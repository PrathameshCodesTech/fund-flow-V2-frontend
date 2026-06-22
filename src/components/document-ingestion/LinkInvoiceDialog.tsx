import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoices } from "@/lib/hooks/useV2Invoice";
import { useLinkRecordInvoice } from "@/lib/hooks/useDocumentIngestion";
import { toast } from "sonner";

interface LinkInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: number;
  documentId: number;
  recordDescription?: string;
}

export function LinkInvoiceDialog({
  open,
  onOpenChange,
  recordId,
  documentId,
  recordDescription,
}: LinkInvoiceDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  const { data: invoices = [], isLoading } = useInvoices(
    debouncedQuery.length >= 2 ? { search: debouncedQuery } : undefined,
  );
  const linkMutation = useLinkRecordInvoice();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter results for display
  const filteredInvoices = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return [];
    return invoices.slice(0, 20); // Limit to 20 results
  }, [invoices, debouncedQuery]);

  const handleConfirm = async () => {
    if (!selectedInvoiceId) {
      toast.error("Please select an invoice");
      return;
    }

    try {
      await linkMutation.mutateAsync({
        id: recordId,
        documentId,
        data: { invoice: selectedInvoiceId },
      });
      toast.success("Record linked to invoice successfully");
      onOpenChange(false);
      setSearchQuery("");
      setSelectedInvoiceId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to link record to invoice");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearchQuery("");
    setSelectedInvoiceId(null);
  };

  const formatCurrency = (amount: string, currency: string): string => {
    const num = parseFloat(amount);
    if (isNaN(num)) return `${currency} ${amount}`;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      minimumFractionDigits: 2,
    }).format(num);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link to Invoice</DialogTitle>
          <DialogDescription>
            {recordDescription
              ? `Search and select an invoice to link with "${recordDescription}".`
              : "Search and select an invoice to link with this record."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Invoices</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by invoice number, title, vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500">Enter at least 2 characters to search</p>
          </div>

          {/* Results */}
          <div className="space-y-2">
            <Label>Results</Label>
            <ScrollArea className="h-[250px] border rounded-lg">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Searching...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {debouncedQuery.length >= 2
                    ? "No invoices found"
                    : "Start typing to search"}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredInvoices.map((invoice) => (
                    <button
                      key={invoice.id}
                      onClick={() => setSelectedInvoiceId(Number(invoice.id))}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-colors",
                        "hover:bg-gray-50 border",
                        selectedInvoiceId === Number(invoice.id)
                          ? "border-primary bg-primary/5"
                          : "border-transparent",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{invoice.title}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {invoice.vendor_name || "No vendor"}
                              {invoice.po_number && ` | PO: ${invoice.po_number}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {invoice.status}
                              </Badge>
                              <span className="text-xs text-gray-600">
                                {formatCurrency(invoice.amount, invoice.currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {selectedInvoiceId === Number(invoice.id) && (
                          <Check className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedInvoiceId || linkMutation.isPending}
          >
            {linkMutation.isPending ? "Linking..." : "Link Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
