import { ArrowRight, ArrowDown, CheckCircle2, XCircle, Play, Flag, Users, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TemplateDetailStep, MappingSummary, ScopeType } from "@/lib/types/workflowConfig";
import { SCOPE_TYPE_LABELS } from "@/lib/types/workflowConfig";

interface FlowPreviewProps {
  steps: TemplateDetailStep[];
}

const SCOPE_COLORS: Record<ScopeType, string> = {
  org_wide: "bg-blue-50 text-blue-700 border-blue-200",
  legal_entity: "bg-purple-50 text-purple-700 border-purple-200",
  org_unit: "bg-orange-50 text-orange-700 border-orange-200",
};

function MappingChip({ m }: { m: MappingSummary }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
        m.is_active ? SCOPE_COLORS[m.scope_type] : "bg-muted text-muted-foreground border-border line-through"
      }`}
    >
      <Users className="w-3 h-3" />
      {m.user_full_name || m.user_email}
      <span className="opacity-70">· {SCOPE_TYPE_LABELS[m.scope_type]}</span>
    </span>
  );
}

function StepCard({ step, index }: { step: TemplateDetailStep; index: number }) {
  const activeMappings = step.mappings.filter((m) => m.is_active);
  const hasMappingGap = step.step_type === "approval" && activeMappings.length === 0;

  return (
    <div className="relative">
      {/* Step card */}
      <Card
        className={`transition-all duration-150 ${
          hasMappingGap ? "border-destructive/50 bg-destructive/5" : "border-border"
        }`}
      >
        <CardContent className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                {step.step_order}
              </span>
              <div>
                <p className="font-semibold text-sm text-foreground">{step.name}</p>
                <p className="text-xs text-muted-foreground">{step.step_type_display}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {step.is_start && (
                <Badge variant="outline" className="text-xs border-green-400 text-green-700 bg-green-50 gap-1">
                  <Play className="w-3 h-3" /> START
                </Badge>
              )}
              {step.is_terminal && (
                <Badge variant="outline" className="text-xs border-indigo-400 text-indigo-700 bg-indigo-50 gap-1">
                  <Flag className="w-3 h-3" /> END
                </Badge>
              )}
            </div>
          </div>

          {/* Transitions */}
          <div className="space-y-1.5 mb-3">
            {step.approve_to_step && (
              <div className="flex items-center gap-1.5 text-xs text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span className="font-medium">Approve →</span>
                <span className="bg-green-50 border border-green-200 px-1.5 py-0.5 rounded text-green-700">
                  {step.approve_to_step.name}
                </span>
              </div>
            )}
            {step.is_terminal && !step.approve_to_step && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-medium">Approve →</span>
                <span className="bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                  Workflow Complete
                </span>
              </div>
            )}
            {step.reject_to_step ? (
              <div className="flex items-center gap-1.5 text-xs text-orange-700">
                <XCircle className="w-3.5 h-3.5 text-orange-600" />
                <span className="font-medium">Reject →</span>
                <span className="bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-orange-700">
                  {step.reject_to_step.name}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject → Workflow ends rejected</span>
              </div>
            )}
          </div>

          {/* Mappings */}
          {step.step_type === "approval" && (
            <div>
              {hasMappingGap ? (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-medium">No active approver mappings — must fix before activating</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {activeMappings.map((m) => (
                    <MappingChip key={m.id} m={m} />
                  ))}
                  {step.mappings.some((m) => !m.is_active) && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{step.mappings.filter((m) => !m.is_active).length} inactive
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connector arrow to next card — NOT the last step */}
      {index < 999 && (
        <div className="flex justify-center py-2 text-muted-foreground">
          <ArrowDown className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

export function FlowPreview({ steps }: FlowPreviewProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <ArrowRight className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium">No steps configured yet.</p>
        <p className="text-xs mt-1">Add steps in the Steps tab to see the flow here.</p>
      </div>
    );
  }

  const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);

  return (
    <div className="space-y-0 max-w-xl mx-auto">
      {/* Snapshot note */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-xl border border-border text-xs text-muted-foreground mb-5">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          <strong>Snapshot note:</strong> In-flight workflows keep their own runtime snapshot.
          Template edits affect new workflows only — not already-snapshotted steps.
        </span>
      </div>

      {sorted.map((step, i) => (
        <StepCard key={step.id} step={step} index={i} />
      ))}
    </div>
  );
}
