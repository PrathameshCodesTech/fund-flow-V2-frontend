import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, X, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganizations } from "@/lib/hooks/useOrganizations";
import { useUploadDocument } from "@/lib/hooks/useDocumentIngestion";
import { toast } from "sonner";

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Backend-allowed file extensions
const ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".xlsm", ".csv", ".json", ".txt", ".text"];
const ALLOWED_ACCEPT = ALLOWED_EXTENSIONS.join(",");

// Backend max file size: 25MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

export function UploadDocumentDialog({ open, onOpenChange }: UploadDocumentDialogProps) {
  const [orgId, setOrgId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const uploadMutation = useUploadDocument();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (f: File): string | null => {
    const ext = getFileExtension(f.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Supported: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    if (f.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 25MB.";
    }
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const error = validateFile(droppedFile);
      if (error) {
        toast.error(error);
        return;
      }
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const error = validateFile(selectedFile);
      if (error) {
        toast.error(error);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!orgId || !file) return;

    try {
      await uploadMutation.mutateAsync({
        orgId: parseInt(orgId, 10),
        file,
      });
      toast.success("Document uploaded successfully");
      onOpenChange(false);
      setOrgId("");
      setFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload document");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setOrgId("");
    setFile(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document for processing. Supported formats: PDF, Excel (.xlsx, .xlsm), CSV, JSON, TXT.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Organization Selection */}
          <div className="space-y-2">
            <Label htmlFor="org">Organization</Label>
            <Select
              value={orgId}
              onValueChange={setOrgId}
              disabled={orgsLoading}
            >
              <SelectTrigger id="org">
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations
                  .filter((org) => org.is_active)
                  .map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Drop Zone */}
          <div className="space-y-2">
            <Label>Document File</Label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300",
                file && "border-green-400 bg-green-50",
              )}
            >
              {file ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="h-8 w-8 text-green-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">
                      Drag and drop a file here, or{" "}
                      <label className="text-primary hover:underline cursor-pointer">
                        browse
                        <input
                          type="file"
                          className="hidden"
                          accept={ALLOWED_ACCEPT}
                          onChange={handleFileSelect}
                        />
                      </label>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Max file size: 25MB</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!orgId || !file || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
