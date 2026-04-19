import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { tenantAdminApi } from "@/lib/api/tenantAdmin";
import { UserCog, Loader2 } from "lucide-react";

interface ReassignDialogProps {
  open: boolean;
  onClose: () => void;
  stepId: string;
  stepName: string;
  currentAssignee: { id: string; full_name: string; email: string } | null;
  onReassign: (assignee: string, comment: string) => Promise<void>;
  isReassigning: boolean;
  error?: string | null;
}

export function ReassignDialog({
  open,
  onClose,
  stepId: _stepId,
  stepName,
  currentAssignee,
  onReassign,
  isReassigning,
  error: serverError,
}: ReassignDialogProps) {
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [comment, setComment] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Fetch active users for the reassign dropdown
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users-for-reassign"],
    queryFn: () => tenantAdminApi.listUsers({ active_only: "true" }),
    enabled: open,
  });

  const users = usersData ?? [];

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setSelectedUser("");
      setComment("");
      setLocalError(null);
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (!selectedUser) {
      setLocalError("Select a new approver.");
      return;
    }
    if (selectedUser === currentAssignee?.id) {
      setLocalError("Select a different approver than the current one.");
      return;
    }
    setLocalError(null);
    try {
      await onReassign(selectedUser, comment);
      setSelectedUser("");
      setComment("");
      onClose();
    } catch {
      // Error surfaced via serverError
    }
  };

  const displayError = localError || serverError;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-4 h-4" />
            Reassign Step
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current assignee */}
          <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
            <p className="text-xs text-muted-foreground mb-1">Currently assigned</p>
            <p className="font-medium">
              {currentAssignee?.full_name || currentAssignee?.email || "Unassigned"}
            </p>
            <p className="text-xs text-muted-foreground">{stepName}</p>
          </div>

          {/* New assignee */}
          <div className="space-y-1">
            <Label>Reassign to *</Label>
            {usersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading users…
              </div>
            ) : (
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new approver…" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.id !== currentAssignee?.id)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div>
                          <p className="font-medium">
                            {u.full_name || u.email}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-1">
            <Label>Note <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              placeholder="Why is this being reassigned? (visible in audit trail)…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
          </div>

          {displayError && (
            <p className="text-destructive text-xs">{displayError}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isReassigning}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isReassigning || !selectedUser || usersLoading}
          >
            {isReassigning ? "Reassigning…" : "Reassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
