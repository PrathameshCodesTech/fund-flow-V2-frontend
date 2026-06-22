import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FinanceShell } from "@/components/v2/FinanceShell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import {
  DocumentStatusBadge,
  DocumentTypeBadge,
  StatusCountsBar,
} from "@/components/document-ingestion";
import {
  useDocumentImports,
  useDocumentCounts,
  useDocumentSources,
} from "@/lib/hooks/useDocumentIngestion";
import { useOrganizations } from "@/lib/hooks/useOrganizations";
import {
  DOCUMENT_TYPE_LABELS,
  type ExternalDocumentStatus,
  type ExternalDocumentType,
} from "@/lib/types/documentIngestion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function DocumentIngestionQueuePage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<ExternalDocumentStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<ExternalDocumentType | undefined>();
  const [orgFilter, setOrgFilter] = useState<number | undefined>();
  const [sourceFilter, setSourceFilter] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const {
    data: documentsResponse,
    isLoading: documentsLoading,
    isFetching,
    refetch,
  } = useDocumentImports(
    {
      status: statusFilter,
      document_type: typeFilter,
      org: orgFilter,
      source: sourceFilter,
      page,
      page_size: PAGE_SIZE,
    },
    { polling: true },
  );

  // Counts - pass org, source, document_type (status intentionally excluded)
  const { data: counts, isLoading: countsLoading } = useDocumentCounts(
    { org: orgFilter, source: sourceFilter, document_type: typeFilter },
    { polling: true },
  );

  const { data: organizations = [] } = useOrganizations();
  const { data: sources = [] } = useDocumentSources();

  const documents = documentsResponse?.results ?? [];
  const totalCount = documentsResponse?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleStatusFilterChange = (status: ExternalDocumentStatus | undefined) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleTypeFilterChange = (type: string) => {
    setTypeFilter(type === "all" ? undefined : (type as ExternalDocumentType));
    setPage(1);
  };

  const handleOrgFilterChange = (org: string) => {
    setOrgFilter(org === "all" ? undefined : parseInt(org, 10));
    setSourceFilter(undefined); // Reset source when org changes
    setPage(1);
  };

  const handleSourceFilterChange = (source: string) => {
    setSourceFilter(source === "all" ? undefined : parseInt(source, 10));
    setPage(1);
  };

  const handleRowClick = (id: number) => {
    navigate(`/finance/document-ingestion/${id}`);
  };

  const formatFileSize = (bytes: number | null): string => {
    if (bytes === null) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter sources by selected org
  const filteredSources = orgFilter
    ? sources.filter((s) => s.org === orgFilter)
    : sources;

  return (
    <FinanceShell
      title="Document Ingestion"
      breadcrumbs={[
        { label: "Finance", href: "/finance" },
        { label: "Document Ingestion" },
      ]}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Document Ingestion</h1>
              <p className="text-muted-foreground mt-1">
                Review and process imported documents
              </p>
            </div>
          </div>

          {/* Status Counts */}
          {countsLoading ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-32" />
              ))}
            </div>
          ) : counts ? (
            <StatusCountsBar
              counts={counts}
              selectedStatus={statusFilter}
              onStatusClick={handleStatusFilterChange}
            />
          ) : null}

          {/* Documents Card */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            {/* Card Header with Filters */}
            <div className="px-6 py-4 border-b bg-muted/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-foreground">Imported Documents</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalCount} document{totalCount !== 1 ? "s" : ""} total
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={orgFilter?.toString() || "all"}
                    onValueChange={handleOrgFilterChange}
                  >
                    <SelectTrigger className="w-44 h-9 text-sm">
                      <SelectValue placeholder="Organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organizations</SelectItem>
                      {organizations
                        .filter((o) => o.is_active)
                        .map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={sourceFilter?.toString() || "all"}
                    onValueChange={handleSourceFilterChange}
                  >
                    <SelectTrigger className="w-40 h-9 text-sm">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {filteredSources.map((source) => (
                        <SelectItem key={source.id} value={source.id.toString()}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={typeFilter || "all"}
                    onValueChange={handleTypeFilterChange}
                  >
                    <SelectTrigger className="w-36 h-9 text-sm">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="w-[250px]">File Name</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Records</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead>Imported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="flex items-center justify-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Loading documents...</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="rounded-full p-6 mb-4 bg-muted">
                            <RefreshCw className="h-10 w-10 text-muted-foreground" />
                          </div>
                          <h3 className="font-semibold text-lg text-foreground mb-1">No documents found</h3>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            No documents match your current filters. Try adjusting the filters or upload a new document.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    documents.map((doc) => (
                      <TableRow
                        key={doc.id}
                        className="cursor-pointer hover:bg-primary/5 transition-colors"
                        onClick={() => handleRowClick(doc.id)}
                      >
                        <TableCell className="font-medium">
                          <span className="truncate block max-w-[230px]" title={doc.original_filename}>
                            {doc.original_filename}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{doc.org_name}</TableCell>
                        <TableCell className="text-muted-foreground">{doc.source_name || "—"}</TableCell>
                        <TableCell>
                          <DocumentTypeBadge type={doc.document_type} />
                        </TableCell>
                        <TableCell>
                          <DocumentStatusBadge status={doc.status} />
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{doc.record_count}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatFileSize(doc.file_size)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <span title={format(new Date(doc.created_at), "PPpp")}>
                            {format(new Date(doc.created_at), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </FinanceShell>
  );
}
