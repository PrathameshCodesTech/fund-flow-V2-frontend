import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { financeApprove, financeReject, getPublicFinanceToken } from "@/lib/api/v2finance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.errors["detail"]?.[0] ?? err.message ?? "An error occurred";
  }
  if (err instanceof Error) return err.message;
  return "An error occurred";
}

function MessageScreen({ title, message, destructive = false }: { title: string; message: string; destructive?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8">
          {destructive ? (
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          ) : (
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          )}
          <h1 className="text-xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FinanceReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [referenceId, setReferenceId] = useState("");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const tokenQuery = useQuery({
    queryKey: ["v2", "finance", "public", token],
    queryFn: () => getPublicFinanceToken(token!),
    enabled: !!token,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: () => financeApprove(token!, { reference_id: referenceId.trim(), note: note.trim() || undefined }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => financeReject(token!, { note: note.trim() || undefined }),
  });

  if (tokenQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading finance review...
        </div>
      </div>
    );
  }

  if (tokenQuery.isError || !tokenQuery.data) {
    return <MessageScreen title="Invalid Link" message={errorMessage(tokenQuery.error)} destructive />;
  }

  const data = tokenQuery.data;

  if (data.is_expired) {
    return <MessageScreen title="Link Expired" message="This finance review link has expired. Please request a new email." destructive />;
  }

  if (data.is_used) {
    return <MessageScreen title="Already Completed" message="This finance review link has already been used." destructive />;
  }

  if (approveMutation.isSuccess) {
    return <MessageScreen title="Finance Approval Recorded" message={`${data.subject_name} has been approved successfully.`} />;
  }

  if (rejectMutation.isSuccess) {
    return <MessageScreen title="Finance Rejection Recorded" message={`${data.subject_name} has been rejected successfully.`} destructive />;
  }

  const isApprove = data.action_type === "approve";
  const isPending = approveMutation.isPending || rejectMutation.isPending;
  const apiError = approveMutation.error ?? rejectMutation.error;

  const submit = () => {
    setLocalError(null);
    if (isApprove && !referenceId.trim()) {
      setLocalError("Reference ID is required for finance approval.");
      return;
    }
    if (isApprove) {
      approveMutation.mutate();
      return;
    }
    rejectMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.module} - {data.subject_name}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Module</span>
              <span className="font-medium capitalize">{data.module}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Subject</span>
              <span className="font-medium">{data.subject_name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{data.subject_type}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Decision</span>
              <span className={`font-medium ${isApprove ? "text-green-700" : "text-destructive"}`}>
                {isApprove ? "Approve" : "Reject"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isApprove ? "Approval" : "Rejection"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isApprove && (
              <div className="space-y-1.5">
                <Label htmlFor="reference-id">Reference ID *</Label>
                <Input
                  id="reference-id"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="Enter finance reference / SAP ID"
                  autoFocus
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="note">{isApprove ? "Note" : "Rejection Reason"}</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isApprove ? "Optional note" : "Optional rejection note"}
                autoFocus={!isApprove}
              />
            </div>

            {(localError || apiError) && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {localError ?? errorMessage(apiError)}
              </div>
            )}

            <Button
              onClick={submit}
              disabled={isPending}
              variant={isApprove ? "default" : "destructive"}
              className="w-full"
            >
              {isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
              ) : isApprove ? (
                <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Approval</>
              ) : (
                <><XCircle className="mr-2 h-4 w-4" /> Confirm Rejection</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
