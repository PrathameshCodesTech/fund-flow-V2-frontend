import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAssignmentPlan, useAssignDraftStep, useActivateInstance } from "@/lib/hooks/useV2Runtime";
import { ApiError } from "@/lib/api/client";
import { INSTANCE_STATUS_LABELS } from "@/lib/types/v2runtime";
import type { AssignmentPlanStep, AssignmentState } from "@/lib/types/v2runtime";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Play,
} from "lucide-react";

// ── Status colors ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_COLORS[status] ?? ""} variant="outline">
      {INSTANCE_STATUS_LABELS[status as keyof typeof INSTANCE_STATUS_LABELS] ?? status}
    </Badge>
  );
}

// ── Page loading ──────────────────────────────────────────────────────────────

function PageLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// ── Step assignment row ───────────────────────────────────────────────────────

function StepAssignmentRow({
  step,
  onAssign,
  isAssigning,
}: {
  step: AssignmentPlanStep;
  onAssign: (userId: string) => void;
  isAssigning: boolean;
}) {
  const [selectedUserId, setSelectedUserId] = useState<string>(
    step.assigned_user ? String(step.assigned_user.id) : "",
  );

  const hasEligibleUsers = step.eligible_users.length > 0;
  const isNoEligible = step.assignment_state === ("NO_ELIGIBLE_USERS" as AssignmentState);
  const isAssignmentRequired = step.assignment_state === ("ASSIGNMENT_REQUIRED" as AssignmentState);
  const isSplitStep = step.step_kind === "SPLIT_BY_SCOPE";

  const handleChange = (userId: string) => {
    setSelectedUserId(userId);
    if (userId) {
      onAssign(userId);
    }
  };

  return (
    <div className={`flex items-start gap-4 rounded-lg border px-4 py-3 bg-background ${isNoEligible && !isSplitStep ? "border-destructive/60 bg-destructive/5" : "border-border"}`}>
      {/* Step info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium">{step.step_name}</p>
          {step.assigned_user && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle2 className="h-3 w-3" />
              Assigned
            </span>
          )}
          {isSplitStep && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <CheckCircle2 className="h-3 w-3" />
              System split
            </span>
          )}
          {isAssignmentRequired && !step.assigned_user && !isSplitStep && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              <AlertTriangle className="h-3 w-3" />
              Pick required</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Role: <span className="font-medium text-foreground">{step.required_role}</span></span>
          <span>Scope: <span className="font-medium text-foreground">{step.resolved_scope_node_name ?? "—"}</span></span>
          <span>Policy: <span className="font-medium text-foreground">{step.scope_resolution_policy.replace(/_/g, " ")}</span></span>
        </div>
        {isSplitStep ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Branch assignees are resolved per target entity after this stage starts.
          </div>
        ) : isNoEligible && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            No eligible users — no one holds the required role at the target scope. Fix workflow configuration.
          </div>
        )}
      </div>

      {/* User picker */}
      <div className="w-56 shrink-0">
        {isSplitStep ? (
          <p className="text-xs text-muted-foreground italic py-1.5">Assigned at branch creation</p>
        ) : hasEligibleUsers ? (
          <Select
            value={selectedUserId}
            onValueChange={handleChange}
            disabled={isAssigning}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select assignee..." />
            </SelectTrigger>
            <SelectContent>
              {step.eligible_users.map((user) => (
                <SelectItem key={user.id} value={String(user.id)}>
                  {user.first_name} {user.last_name}
                  <span className="ml-1 text-muted-foreground">({user.email})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-xs text-muted-foreground italic py-1.5">No eligible users</p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkflowDraftAssignPage() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();

  const { data: plan, isLoading, isError, error, refetch } = useAssignmentPlan(instanceId ?? null);
  const assignDraftStep = useAssignDraftStep();
  const activateInstance = useActivateInstance();

  const [activateError, setActivateError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  const noEligibleCount =
    plan?.groups.reduce(
      (acc, g) =>
        acc + g.steps.filter(
          (s) => s.step_kind !== "SPLIT_BY_SCOPE" && s.assignment_state === ("NO_ELIGIBLE_USERS" as AssignmentState),
        ).length,
      0,
    ) ?? 0;

  const allStepsAssigned =
    plan?.groups.every((g) =>
      g.steps.every((s) => s.step_kind === "SPLIT_BY_SCOPE" || s.assigned_user !== null),
    ) ?? false;

  const handleAssign = async (instanceStepId: number, userId: string) => {
    try {
      await assignDraftStep.mutateAsync({
        instanceStepId: String(instanceStepId),
        userId,
      });
      refetch();
    } catch {
      // error via mutation
    }
  };

  const handleActivate = async () => {
    if (!instanceId || !allStepsAssigned) return;
    setActivating(true);
    setActivateError(null);
    try {
      await activateInstance.mutateAsync(instanceId);
      navigate("/tasks");
    } catch (err) {
      if (err instanceof ApiError) {
        setActivateError(err.message);
      } else {
        setActivateError("Activation failed. Please try again.");
      }
      setActivating(false);
    }
  };

  if (isLoading) return <PageLoading />;

  if (isError || !plan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Failed to load assignment plan."}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/invoices")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Invoices
          </Button>
          <div className="h-5 w-px bg-border" />
          <div>
            <h1 className="text-sm font-semibold">
              Workflow Assignment — {plan.subject_type}:{plan.subject_id}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={plan.status} />
              <span className="text-xs text-muted-foreground">
                {plan.groups.reduce((acc, g) => acc + g.steps.length, 0)} step
                {plan.groups.reduce((acc, g) => acc + g.steps.length, 0) !== 1 ? "s" : ""} across{" "}
                {plan.groups.length} group{plan.groups.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Activation panel */}
        <div className="flex items-center gap-3">
          {noEligibleCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {noEligibleCount} step{noEligibleCount !== 1 ? "s" : ""} blocked — fix workflow configuration first
            </div>
          )}
          {!allStepsAssigned && noEligibleCount === 0 && (
            <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Assign all steps to activate
            </div>
          )}
          {plan.status === "DRAFT" && (
            <Button
              size="sm"
              onClick={handleActivate}
              disabled={!allStepsAssigned || activating || activateInstance.isPending}
              title={
                noEligibleCount > 0
                  ? "Cannot activate: some steps have no eligible users"
                  : !allStepsAssigned
                  ? "Cannot activate: all steps must be assigned first"
                  : undefined
              }
              className="gap-1.5"
            >
              {activating || activateInstance.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Activate Workflow
                </>
              )}
            </Button>
          )}
          {plan.status === "ACTIVE" && (
            <Button size="sm" variant="outline" onClick={() => navigate("/tasks")}>
              View Tasks
            </Button>
          )}
        </div>
      </header>

      {activateError && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {activateError}
        </div>
      )}

      {/* Assignment groups */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl space-y-6 p-6">
          {plan.groups.length === 0 ? (
            <div className="rounded-lg border border-border bg-secondary/20 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No step groups defined in this workflow template.
              </p>
            </div>
          ) : (
            plan.groups.map((group) => (
              <div key={group.instance_group_id} className="space-y-3">
                {/* Group header */}
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">{group.name}</h2>
                  <Badge variant="outline" className="text-xs">
                    {group.steps.length} step{group.steps.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                  {group.steps.map((step) => (
                    <StepAssignmentRow
                      key={step.instance_step_id}
                      step={step}
                      onAssign={(userId) => handleAssign(step.instance_step_id, userId)}
                      isAssigning={assignDraftStep.isPending}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
