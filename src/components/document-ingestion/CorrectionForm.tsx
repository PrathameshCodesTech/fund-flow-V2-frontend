import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCorrectRecord } from "@/lib/hooks/useDocumentIngestion";
import type {
  ExternalDocumentRecord,
  RecordNormalizedData,
  ExternalDocumentType,
} from "@/lib/types/documentIngestion";
import { toast } from "sonner";

interface CorrectionFormProps {
  record: ExternalDocumentRecord;
  documentId: number;
  onSuccess?: () => void;
}

const CURRENCIES = [
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
];

const DOCUMENT_TYPES: { value: ExternalDocumentType; label: string }[] = [
  { value: "unknown", label: "Unknown" },
  { value: "invoice", label: "Invoice" },
  { value: "payment_advice", label: "Payment Advice" },
];

export function CorrectionForm({ record, documentId, onSuccess }: CorrectionFormProps) {
  // Initialize from record.normalized_data, preserving ALL existing keys
  // The spread ensures unknown/extractor-specific fields are included
  const initFromNormalizedData = (nd: RecordNormalizedData | null): RecordNormalizedData => ({
    // Spread all existing data first to preserve unknown/extractor-specific fields
    ...(nd ?? {}),
    // Then ensure known fields have string defaults for form inputs
    vendor_code: nd?.vendor_code ?? "",
    vendor_name: nd?.vendor_name ?? "",
    vendor_email: nd?.vendor_email ?? "",
    gstin: nd?.gstin ?? "",
    invoice_number: nd?.invoice_number ?? "",
    sap_document_number: nd?.sap_document_number ?? "",
    amount: nd?.amount ?? "",
    currency: nd?.currency ?? "INR",
    payment_date: nd?.payment_date ?? "",
    utr_number: nd?.utr_number ?? "",
    payment_reference_number: nd?.payment_reference_number ?? "",
  });

  // normalizedData contains ALL keys: both known fields (with defaults) and unknown fields (preserved)
  const [normalizedData, setNormalizedData] = useState<RecordNormalizedData>(
    initFromNormalizedData(record.normalized_data),
  );
  const [documentType, setDocumentType] = useState<ExternalDocumentType>(record.document_type);

  const correctMutation = useCorrectRecord();

  // Reset form completely when record changes to prevent stale data from previous record
  useEffect(() => {
    setNormalizedData(initFromNormalizedData(record.normalized_data));
    setDocumentType(record.document_type);
  }, [record.id, record.normalized_data, record.document_type]);

  const handleChange = (field: keyof RecordNormalizedData, value: string) => {
    setNormalizedData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Submit current normalizedData directly - it already contains:
    // 1. All unknown/extractor-specific fields (from initial spread)
    // 2. All known fields with their current values (including empty strings for cleared fields)
    const payload: RecordNormalizedData = { ...normalizedData };

    try {
      await correctMutation.mutateAsync({
        id: record.id,
        documentId,
        data: {
          normalized_data: payload,
          document_type: documentType !== record.document_type ? documentType : undefined,
        },
      });
      toast.success("Record updated successfully");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update record");
    }
  };

  const isPaymentAdvice = documentType === "payment_advice";

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Document Type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Document Classification</CardTitle>
            <CardDescription>Change the document type if incorrectly classified</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="document_type">Document Type</Label>
              <Select value={documentType} onValueChange={(v) => setDocumentType(v as ExternalDocumentType)}>
                <SelectTrigger id="document_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>
                      {dt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vendor Information</CardTitle>
            <CardDescription>Information about the vendor from the document</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor_name">Vendor Name</Label>
              <Input
                id="vendor_name"
                value={normalizedData.vendor_name ?? ""}
                onChange={(e) => handleChange("vendor_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_email">Vendor Email</Label>
              <Input
                id="vendor_email"
                type="email"
                value={normalizedData.vendor_email ?? ""}
                onChange={(e) => handleChange("vendor_email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                value={normalizedData.gstin ?? ""}
                onChange={(e) => handleChange("gstin", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_code">SAP Vendor Code</Label>
              <Input
                id="vendor_code"
                value={normalizedData.vendor_code ?? ""}
                onChange={(e) => handleChange("vendor_code", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice/Payment Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isPaymentAdvice ? "Payment Information" : "Invoice Information"}
            </CardTitle>
            <CardDescription>Details extracted from the document</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {!isPaymentAdvice && (
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  value={normalizedData.invoice_number ?? ""}
                  onChange={(e) => handleChange("invoice_number", e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="sap_document_number">SAP Document Number</Label>
              <Input
                id="sap_document_number"
                value={normalizedData.sap_document_number ?? ""}
                onChange={(e) => handleChange("sap_document_number", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={normalizedData.amount ?? ""}
                onChange={(e) => handleChange("amount", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={normalizedData.currency ?? "INR"}
                onValueChange={(v) => handleChange("currency", v)}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isPaymentAdvice && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="payment_date">Payment Date</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={normalizedData.payment_date ?? ""}
                    onChange={(e) => handleChange("payment_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utr_number">UTR Number</Label>
                  <Input
                    id="utr_number"
                    value={normalizedData.utr_number ?? ""}
                    onChange={(e) => handleChange("utr_number", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_reference_number">Payment Reference</Label>
                  <Input
                    id="payment_reference_number"
                    value={normalizedData.payment_reference_number ?? ""}
                    onChange={(e) => handleChange("payment_reference_number", e.target.value)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={correctMutation.isPending}>
            {correctMutation.isPending ? "Saving..." : "Save Corrections"}
          </Button>
        </div>
      </div>
    </form>
  );
}
