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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import type { WorkflowTemplateWrite, Module } from "@/lib/types/workflowConfig";
import { INVOICE_TEMPLATE_GUIDANCE } from "@/lib/types/workflowConfig";
import type { OrganizationSummary } from "@/lib/types/organization";
import type { WorkflowTemplateDetail } from "@/lib/types/workflowConfig";

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: WorkflowTemplateWrite) => Promise<void>;
  organizations: OrganizationSummary[];
  modules: Module[];
  editingTemplate?: WorkflowTemplateDetail | null;
}

interface FormState {
  organization: string;
  module: string;
  code: string;
  name: string;
  description: string;
}

const EMPTY: FormState = {
  organization: "",
  module: "",
  code: "",
  name: "",
  description: "",
};

export function TemplateDialog({
  open,
  onClose,
  onSave,
  organizations,
  modules,
  editingTemplate,
}: TemplateDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const isEdit = !!editingTemplate;

  useEffect(() => {
    if (open) {
      if (editingTemplate) {
        setForm({
          organization: editingTemplate.organization,
          module: editingTemplate.module,
          code: editingTemplate.code,
          name: editingTemplate.name,
          description: editingTemplate.description,
        });
      } else {
        setForm(EMPTY);
      }
      setErrors({});
    }
  }, [open, editingTemplate]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => { const c = { ...e }; delete c[key]; return c; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.organization) errs.organization = "Select an organization.";
    if (!form.module) errs.module = "Select a module.";
    if (!form.code.trim()) errs.code = "Code is required.";
    if (!form.name.trim()) errs.name = "Name is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({ ...form });
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Template" : "New Workflow Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Organization */}
          <div className="space-y-1">
            <Label>Organization *</Label>
            <Select
              value={form.organization}
              onValueChange={(v) => set("organization", v)}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select organization…" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.organization && (
              <p className="text-destructive text-xs">{errors.organization}</p>
            )}
            {isEdit && (
              <p className="text-xs text-muted-foreground">Organization cannot be changed after creation.</p>
            )}
          </div>

          {/* Module */}
          <div className="space-y-1">
            <Label>Module *</Label>
            <Select value={form.module} onValueChange={(v) => set("module", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select module…" />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.module && <p className="text-destructive text-xs">{errors.module}</p>}
            {form.module && (() => {
              const selected = modules.find((m) => m.id === form.module);
              if (selected?.code === "invoices") {
                return (
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Invoice — expected step order (Manual Link):</strong>{" "}
                    {INVOICE_TEMPLATE_GUIDANCE}
                  </p>
                );
              }
              return selected ? (
                <p className="text-xs text-muted-foreground">Module: {selected.name}</p>
              ) : null;
            })()}
          </div>

          {/* Code */}
          <div className="space-y-1">
            <Label>Code *</Label>
            <Input
              placeholder="e.g. invoice-approval"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              disabled={isEdit}
            />
            {errors.code && <p className="text-destructive text-xs">{errors.code}</p>}
            {isEdit && (
              <p className="text-xs text-muted-foreground">Code cannot be changed after creation.</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input
              placeholder="e.g. Invoice Approval Workflow"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              placeholder="Optional description of when this workflow is used…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
            />
            {form.module && (() => {
              const selected = modules.find((m) => m.id === form.module);
              if (selected?.code === "invoices") {
                return (
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Manual-link invoice template:</strong> activation is optional. Publish a version to use it with the Attach Workflow action on invoices.
                  </p>
                );
              }
              return null;
            })()}
          </div>

          {(errors.__all__ || errors.non_field_errors) && (
            <p className="text-destructive text-xs">
              {errors.__all__ || errors.non_field_errors}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
