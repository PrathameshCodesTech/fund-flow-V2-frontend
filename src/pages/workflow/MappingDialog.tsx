import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ApiError } from "@/lib/api/client";
import type {
  StepApproverMapping,
  StepApproverMappingWrite,
  ScopeType,
} from "@/lib/types/workflowConfig";
import { SCOPE_TYPE_LABELS, SCOPE_TYPE_DESCRIPTIONS } from "@/lib/types/workflowConfig";
import type { WorkflowTemplateStep } from "@/lib/types/workflowConfig";
import { useQuery } from "@tanstack/react-query";
import { tenantAdminApi } from "@/lib/api/tenantAdmin";

interface MappingDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: StepApproverMappingWrite) => Promise<void>;
  templateSteps: WorkflowTemplateStep[];
  organizationId: string;
  editingMapping?: StepApproverMapping | null;
  /** Pre-select a step when opening from Steps tab */
  defaultStepId?: string;
}

type FormState = {
  template_step: string;
  scope_type: ScopeType;
  organization: string;
  legal_entity: string;
  org_unit: string;
  user: string;
  is_active: boolean;
};

const EMPTY_FORM: (orgId: string, stepId: string) => FormState = (orgId, stepId) => ({
  template_step: stepId,
  scope_type: "org_wide",
  organization: orgId,
  legal_entity: "",
  org_unit: "",
  user: "",
  is_active: true,
});

export function MappingDialog({
  open,
  onClose,
  onSave,
  templateSteps,
  organizationId,
  editingMapping,
  defaultStepId = "",
}: MappingDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM(organizationId, defaultStepId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isEdit = !!editingMapping;

  // Load legal entities for this org
  const { data: leData } = useQuery({
    queryKey: ["le-for-mapping", organizationId],
    queryFn: () => tenantAdminApi.listLegalEntities({ organization: organizationId }),
    enabled: open && !!organizationId,
  });

  // Load org units for this org
  const { data: ouData } = useQuery({
    queryKey: ["ou-for-mapping", organizationId],
    queryFn: () => tenantAdminApi.listOrgUnits({ organization: organizationId }),
    enabled: open && !!organizationId,
  });

  // Load all users
  const { data: usersData } = useQuery({
    queryKey: ["users-for-mapping"],
    queryFn: () => tenantAdminApi.listUsers({ active_only: "true" }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (editingMapping) {
        setForm({
          template_step: editingMapping.template_step,
          scope_type: editingMapping.scope_type,
          organization: editingMapping.organization.id,
          legal_entity: editingMapping.legal_entity?.id ?? "",
          org_unit: editingMapping.org_unit?.id ?? "",
          user: editingMapping.user.id,
          is_active: editingMapping.is_active,
        });
      } else {
        setForm(EMPTY_FORM(organizationId, defaultStepId));
      }
      setErrors({});
    }
  }, [open, editingMapping, organizationId, defaultStepId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const copy = { ...e }; delete copy[key]; return copy; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.template_step) errs.template_step = "Select a step.";
    if (!form.user) errs.user = "Select a user.";
    if (form.scope_type === "legal_entity" && !form.legal_entity)
      errs.legal_entity = "Select a legal entity for this scope.";
    if (form.scope_type === "org_unit" && !form.org_unit)
      errs.org_unit = "Select an org unit for this scope.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: StepApproverMappingWrite = {
        template_step: form.template_step,
        scope_type: form.scope_type,
        organization: form.organization,
        user: form.user,
        is_active: form.is_active,
        // For org_wide scope, must send null explicitly (not omit)
        // Backend StepApproverMapping.clean() validates that legal_entity/org_unit
        // are null when scope_type is org_wide
        legal_entity: form.scope_type === "org_wide" ? null : (form.legal_entity || null),
        org_unit: form.scope_type === "org_wide" ? null : (form.org_unit || null),
      };
      if (form.scope_type === "legal_entity" && form.legal_entity) {
        payload.legal_entity = form.legal_entity;
      }
      if (form.scope_type === "org_unit" && form.org_unit) {
        payload.org_unit = form.org_unit;
      }
      await onSave(payload);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.errors)) {
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        }
        setErrors(mapped);
      }
    } finally {
      setSaving(false);
    }
  };

  // Mapping is needed for review (forward/return actions) and approval steps
  const mappableSteps = templateSteps.filter(
    (s) => s.step_type === "review" || s.step_type === "approval",
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Approver Mapping" : "Add Approver Mapping"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step */}
          <div className="space-y-1">
            <Label>Workflow step *</Label>
            {mappableSteps.length === 0 ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                No review or approval steps exist in this template yet.{" "}
                <strong>Add those steps first</strong> before creating approver mappings.
              </div>
            ) : (
              <Select value={form.template_step} onValueChange={(v) => set("template_step", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select step…" />
                </SelectTrigger>
                <SelectContent>
                  {mappableSteps.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.step_order}. {s.name} ({s.step_type === "review" ? "Review" : "Approval"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {mappableSteps.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Only Review and Approval steps are shown — vendor steps are auto-approved on submit and payment steps are future-phase.
              </p>
            )}
            {errors.template_step && (
              <p className="text-destructive text-xs">{errors.template_step}</p>
            )}
          </div>

          {/* Scope type */}
          <div className="space-y-1">
            <Label>Scope type *</Label>
            <Select
              value={form.scope_type}
              onValueChange={(v) => {
                set("scope_type", v as ScopeType);
                set("legal_entity", "");
                set("org_unit", "");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SCOPE_TYPE_LABELS) as ScopeType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    <div>
                      <p className="font-medium">{SCOPE_TYPE_LABELS[k]}</p>
                      <p className="text-xs text-muted-foreground">{SCOPE_TYPE_DESCRIPTIONS[k]}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Legal entity (if LE scope) */}
          {form.scope_type === "legal_entity" && (
            <div className="space-y-1">
              <Label>Legal entity *</Label>
              <Select value={form.legal_entity} onValueChange={(v) => set("legal_entity", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select legal entity…" />
                </SelectTrigger>
                <SelectContent>
                  {(leData ?? []).map((le) => (
                    <SelectItem key={le.id} value={le.id}>
                      {le.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.legal_entity && (
                <p className="text-destructive text-xs">{errors.legal_entity}</p>
              )}
            </div>
          )}

          {/* Org unit (if OU scope) */}
          {form.scope_type === "org_unit" && (
            <div className="space-y-1">
              <Label>Org unit *</Label>
              <Select value={form.org_unit} onValueChange={(v) => set("org_unit", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select org unit…" />
                </SelectTrigger>
                <SelectContent>
                  {(ouData ?? []).map((ou) => (
                    <SelectItem key={ou.id} value={ou.id}>
                      {ou.name} ({ou.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.org_unit && (
                <p className="text-destructive text-xs">{errors.org_unit}</p>
              )}
            </div>
          )}

          {/* User */}
          <div className="space-y-1">
            <Label>Approver *</Label>
            <Select value={form.user} onValueChange={(v) => set("user", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select user…" />
              </SelectTrigger>
              <SelectContent>
                {(usersData ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}
                    <span className="text-xs text-muted-foreground ml-1">({u.email})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.user && <p className="text-destructive text-xs">{errors.user}</p>}
          </div>

          {/* Active */}
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.is_active}
                onCheckedChange={(v) => set("is_active", !!v)}
              />
              <span className="text-sm">Active</span>
            </label>
          )}

          {/* General errors */}
          {(errors.__all__ || errors.non_field_errors || errors.detail) && (
            <p className="text-destructive text-xs">
              {errors.__all__ || errors.non_field_errors || errors.detail}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Mapping"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
