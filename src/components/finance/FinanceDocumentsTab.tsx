import { Download, FileText } from "lucide-react";
import type { InvoiceFinanceDocument } from "@/lib/types/v2finance";

function formatDate(value: string | null): string {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

function getDocumentGroup(doc: InvoiceFinanceDocument): "invoice" | "vendor" {
  if (doc.document_group) return doc.document_group;
  return doc.id <= -1000000 ? "vendor" : "invoice";
}

function DocumentSection({
  title,
  description,
  documents,
}: {
  title: string;
  description: string;
  documents: InvoiceFinanceDocument[];
}) {
  if (documents.length === 0) return null;

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{doc.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {doc.document_type} | Uploaded {formatDate(doc.uploaded_at)}
              </p>
            </div>
          </div>
          {doc.url ? (
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="ml-3 shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Download className="h-3.5 w-3.5" /> View
            </a>
          ) : (
            <span className="text-xs text-muted-foreground ml-3 shrink-0">No file</span>
          )}
        </div>
      ))}
    </section>
  );
}

export function FinanceDocumentsTab({ docs }: { docs: InvoiceFinanceDocument[] }) {
  if (!docs || docs.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No documents available.
      </div>
    );
  }

  const invoiceDocuments = docs
    .filter((doc) => getDocumentGroup(doc) === "invoice")
    .sort((a, b) => Number(b.document_type === "source_invoice") - Number(a.document_type === "source_invoice"));
  const vendorDocuments = docs.filter((doc) => getDocumentGroup(doc) === "vendor");

  return (
    <div className="space-y-6">
      <DocumentSection
        title="Invoice Documents"
        description="Original submitted invoice and invoice supporting attachments."
        documents={invoiceDocuments}
      />
      <DocumentSection
        title="Vendor Documents"
        description="Vendor onboarding and compliance attachments."
        documents={vendorDocuments}
      />
    </div>
  );
}
