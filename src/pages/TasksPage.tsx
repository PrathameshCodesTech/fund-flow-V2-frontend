import { useState } from "react";
import { useTasks } from "@/lib/hooks/useV2Runtime";
import { V2Shell } from "@/components/v2/V2Shell";
import { ApprovalReviewDrawer } from "@/components/workflow/ApprovalReviewDrawer";
import type { WorkflowTask, TaskKind } from "@/lib/types/v2runtime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Inbox,
  RefreshCw,
  GitBranch,
  Building2,
  ChevronRight,
  Clock,
} from "lucide-react";

function fmtAge(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function taskPrimaryLabel(task: WorkflowTask) {
  return task.vendor_name?.trim() || task.step_name;
}

function taskInvoiceLabel(task: WorkflowTask) {
  if (task.vendor_invoice_number?.trim()) {
    return task.vendor_invoice_number;
  }
  return `#${task.subject_id}`;
}

function previousActorPrefix(task: WorkflowTask) {
  if (task.previous_actor_action === "approved") return "Approved by";
  if (task.previous_actor_action === "rejected") return "Sent back by";
  return "Handled by";
}

function previousActorLabel(task: WorkflowTask) {
  if (!task.previous_actor_name) return null;
  const parts = [task.previous_actor_name];
  if (task.previous_actor_role) {
    parts.push(task.previous_actor_role);
  }
  return `${previousActorPrefix(task)} ${parts.join(" · ")}`;
}


const STEP_STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const INSTANCE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
};

function StepBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STEP_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </Badge>
  );
}

function InstanceBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${INSTANCE_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </Badge>
  );
}

function TaskCard({
  task,
  onClick,
}: {
  task: WorkflowTask;
  onClick: () => void;
}) {
  const isBranch = task.task_kind === "branch";
  const previousActor = previousActorLabel(task);

  return (
    <button
      data-testid="task-card"
      onClick={onClick}
      className="w-full text-left rounded-lg border border-border bg-background hover:bg-muted/30 hover:border-muted-foreground/20 transition-colors group"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`shrink-0 h-8 w-1 rounded-full ${isBranch ? "bg-blue-400" : "bg-primary/60"}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isBranch && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                <GitBranch className="h-2.5 w-2.5" />
                Branch
              </span>
            )}
            <span className="text-sm font-semibold truncate">{taskPrimaryLabel(task)}</span>
            <StepBadge status={task.status} />
            <InstanceBadge status={task.instance_status} />
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" />
              <span>{taskInvoiceLabel(task)}</span>
            </span>
            {previousActor && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span>{previousActor}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">

            {isBranch && task.target_scope_node_name && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-blue-600 flex items-center gap-1">
                  <GitBranch className="h-3 w-3 shrink-0" />
                  {task.target_scope_node_name}
                </span>
              </>
            )}
            <span className="text-muted-foreground/50">·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {fmtAge(task.created_at)}
            </span>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
      </div>
    </button>
  );
}

function PageLoading() {
  return (
    <div className="flex h-32 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

const TasksPage = () => {
  const { data: tasks = [], isLoading, refetch } = useTasks();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTaskKind, setSelectedTaskKind] = useState<TaskKind | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const openReview = (task: WorkflowTask) => {
    const kind = task.task_kind;
    const id = kind === "step"
      ? task.instance_step_id
      : task.branch_id;
    if (!id) return;
    setSelectedTaskKind(kind);
    setSelectedTaskId(String(id));
    setDrawerOpen(true);
  };

  return (
    <V2Shell
      title="Invoice Pending for Approval"
      titleIcon={<Inbox className="h-5 w-5 text-muted-foreground" />}
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          className="gap-1.5"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <ScrollArea className="flex-1">
        {isLoading ? (
          <PageLoading />
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Inbox className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p>No invoices are pending your approval.</p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            <p className="text-xs text-muted-foreground mb-3">
              {tasks.length} invoice{tasks.length !== 1 ? "s are" : " is"} pending your approval — click a card to review and decide
            </p>
            {tasks.map((task) => (
              <TaskCard
                key={task.task_kind === "step" ? `step-${task.instance_step_id}` : `branch-${task.branch_id}`}
                task={task}
                onClick={() => openReview(task)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <ApprovalReviewDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        taskKind={selectedTaskKind}
        taskId={selectedTaskId}
        onActionSuccess={() => {
          refetch();
          setDrawerOpen(false);
        }}
      />
    </V2Shell>
  );
};

export default TasksPage;

