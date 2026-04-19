import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import type { WorkflowTemplateStep, StepType } from "@/lib/types/workflowConfig";
import {
  STEP_TYPE_LABELS,
  STEP_TYPE_DESCRIPTIONS,
  VENDOR_STEP_DESCRIPTIONS,
} from "@/lib/types/workflowConfig";

interface StepDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: StepFormData) => Promise<void>;
  templateSteps: WorkflowTemplateStep[]; // all steps in this template for FK dropdowns
  editingStep?: WorkflowTemplateStep | null;
  templateId: string;
}

export interface StepFormData {
  template: string;
  step_order: number;
  name: string;
  step_type: StepType;
  is_start: boolean;
  is_terminal: boolean;
  approve_to_step: string | null;
  reject_to_step: string | null;
}

/** Default form state for a new step */
const EMPTY: Omit<StepFormData, "template"> = {
  step_order: 1,
  name: "",
  step_type: "review", // first meaningful step is review (vendor is handled by submit)
  is_start: false,
  is_terminal: false,
  approve_to_step: null,
  reject_to_step: null,
};

export function StepDialog({
  open,
  onClose,
  onSave,
  templateSteps,
  editingStep,
  templateId,
}: StepDialogProps) {
  const [form, setForm] = useState<Omit<StepFormData, "template">>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isEdit = !!editingStep;

  useEffect(() => {
    if (open) {
      if (editingStep) {
        setForm({
          step_order: editingStep.step_order,
          name: editingStep.name,
          step_type: editingStep.step_type,
          is_start: editingStep.is_start,
          is_terminal: editingStep.is_terminal,
          approve_to_step: editingStep.approve_to_step?.id ?? null,
          reject_to_step: editingStep.reject_to_step?.id ?? null,
        });
      } else {
        const maxOrder = Math.max(0, ...templateSteps.map((s) => s.step_order));
        setForm({ ...EMPTY, step_order: maxOrder + 1 });
      }
      setErrors({});
    }
  }, [open, editingStep, templateSteps]);

  // Payment type forces is_terminal and clears approve_to_step
  useEffect(() => {
    if (form.step_type === "payment") {
      setForm((f) => ({ ...f, is_terminal: true, approve_to_step: null }));
    }
  }, [form.step_type]);

  // Vendor step: in manual-link mode, vendor is never the start step
  // and never terminal — it's an optional return target only.
  useEffect(() => {
    if (form.step_type === "vendor") {
      setForm((f) => ({
        ...f,
        is_start: false,
        is_terminal: false,
      }));
    }
  }, [form.step_type]);

  // terminal forces no approve_to_step
  useEffect(() => {
    if (form.is_terminal) {
      setForm((f) => ({ ...f, approve_to_step: null }));
    }
  }, [form.is_terminal]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const copy = { ...e }; delete copy[key]; return copy; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Step name is required.";
    if (!form.step_order || form.step_order < 1) errs.step_order = "Order must be ≥ 1.";

    // NOTE: approve_to_step completeness is validated at activation time, not here.
    // This allows draft templates to be built incrementally — forward references
    // and missing transitions are not blocking during step authoring.

    // Vendor cannot be terminal
    if (form.step_type === "vendor" && form.is_terminal) {
      errs.is_terminal = "Vendor step cannot be terminal.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        template: templateId,
        ...form,
      });
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

  // Exclude the step being edited from FK dropdowns (no self-loop)
  const otherSteps = templateSteps.filter((s) => s.id !== editingStep?.id);

  // canSetStart: in manual-link mode, vendor is never the start (forced off, checkbox disabled)
  const canSetStart = form.step_type !== "vendor";
  const canSetTerminal = form.step_type !== "vendor" && form.step_type !== "payment"; // payment is always terminal
  // Show approve-to-step selector for vendor, review, and approval (not terminal, not payment).
  // Vendor steps must still have approve_to_step configured so the template is complete.
  const needsNextStep = !form.is_terminal && (form.step_type === "vendor" || form.step_type === "approval" || form.step_type === "review");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Step" : "Add Step"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1">
            <Label>Step name *</Label>
            <Input
              placeholder={
                form.step_type === "vendor"
                  ? "e.g. Vendor Submission"
                  : form.step_type === "review"
                  ? "e.g. Marketing Review"
                  : form.step_type === "approval"
                  ? "e.g. HO Approval"
                  : "e.g. Payment Processing"
              }
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            {form.step_type === "vendor" && (
              <p className="text-xs text-muted-foreground">
                {VENDOR_STEP_DESCRIPTIONS}
              </p>
            )}
            {form.step_type === "review" && (
              <p className="text-xs text-muted-foreground">
                The review step follows vendor submit. Reviewers can forward to HO approval or return to the vendor.
              </p>
            )}
            {form.step_type === "approval" && (
              <p className="text-xs text-muted-foreground">
                The approval step is the final finance/HO gate. Approvers can approve or reject back to any prior step.
              </p>
            )}
          </div>

          {/* Order + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Order *</Label>
              <Input
                type="number"
                min={1}
                value={form.step_order}
                onChange={(e) => set("step_order", parseInt(e.target.value) || 1)}
              />
              {errors.step_order && <p className="text-destructive text-xs">{errors.step_order}</p>}
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={form.step_type}
                onValueChange={(v) => set("step_type", v as StepType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STEP_TYPE_LABELS) as StepType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex flex-col text-left">
                        <span>{STEP_TYPE_LABELS[k]}</span>
                        <span className="text-xs text-muted-foreground font-normal">
                          {STEP_TYPE_DESCRIPTIONS[k]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.is_start}
                onCheckedChange={(v) => set("is_start", !!v)}
                disabled={!canSetStart}
              />
              <span className={`text-sm ${!canSetStart ? "text-muted-foreground" : ""}`}>
                Start step
                {!canSetStart && (
                  <span className="text-xs ml-1 text-muted-foreground">
                    (not used as start in manual-link mode)
                  </span>
                )}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.is_terminal}
                onCheckedChange={(v) => set("is_terminal", !!v)}
                disabled={!canSetTerminal}
              />
              <span className={`text-sm ${!canSetTerminal ? "text-muted-foreground" : ""}`}>
                Terminal
                {!canSetTerminal && (
                  <span className="text-xs ml-1 text-muted-foreground">
                    ({form.step_type === "vendor" ? "vendor" : "payment"} auto)
                  </span>
                )}
              </span>
            </label>
          </div>
          {errors.is_terminal && (
            <p className="text-destructive text-xs">{errors.is_terminal}</p>
          )}

          {/* Approve next — for vendor, review, and approval steps when not terminal */}
          {needsNextStep ? (
            <div className="space-y-1">
              <Label>Next step when approved</Label>
              <p className="text-xs text-muted-foreground">
                {form.step_type === "vendor"
                  ? "In manual-link mode, the vendor step is a return target — not auto-approved. When the vendor completes and resubmits, the invoice moves to the selected next step."
                  : form.step_type === "review"
                  ? "When the reviewer approves, the invoice moves to the next step (e.g. an Approval step). Leave blank if the next step doesn't exist yet — you can set it after creating that step."
                  : "When the approver approves, the invoice moves to the next step. For the final approval, mark this step as Terminal instead. Leave blank if the next step doesn't exist yet."}
              </p>
              <Select
                value={form.approve_to_step ?? "__none__"}
                onValueChange={(v) => set("approve_to_step", v === "__none__" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select next step…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— none —</SelectItem>
                  {otherSteps.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.step_order}. {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.approve_to_step && (
                <p className="text-destructive text-xs">{errors.approve_to_step}</p>
              )}
            </div>
          ) : (
            // Hidden field cleared when not needed
            <input type="hidden" value="" onChange={() => set("approve_to_step", null)} />
          )}

          {/* Reject next — applies to approval and review steps */}
          {(form.step_type === "approval" || form.step_type === "review") && (
            <div className="space-y-1">
              <Label>Step to return to on rejection</Label>
              <p className="text-xs text-muted-foreground">
                {form.step_type === "review"
                  ? "Reviewer rejects → invoice is returned to the vendor for correction. Select the vendor step."
                  : "Approver rejects → invoice goes back to the selected step for rework (e.g., back to Review or directly to the vendor)."}
              </p>
              <Select
                value={form.reject_to_step ?? "__none__"}
                onValueChange={(v) => set("reject_to_step", v === "__none__" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Workflow ends rejected (default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— ends rejected —</SelectItem>
                  {otherSteps.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.step_order}. {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.reject_to_step && (
                <p className="text-destructive text-xs">{errors.reject_to_step}</p>
              )}
            </div>
          )}

          {errors.__all__ && (
            <p className="text-destructive text-xs">{errors.__all__}</p>
          )}
          {errors.non_field_errors && (
            <p className="text-destructive text-xs">{errors.non_field_errors}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Step"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
