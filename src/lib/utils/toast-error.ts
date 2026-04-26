/**
 * Extracts a user-friendly error message from various error sources.
 * Priority: field errors (allocations, status, workflow, reason, vendor_invoice_number)
 * → non_field_errors → detail → fallback message
 */
import { ApiError } from "@/lib/api/client";

/**
 * Extracts a meaningful error message from an ApiError or generic error.
 * Looks for common field errors first, then falls back to general errors.
 */
export function extractErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again."
): string {
  if (error instanceof ApiError) {
    // Handle {errors: {field: [msg]}} shape from submission validation
    if (error.errors && typeof error.errors === "object" && !Array.isArray(error.errors)) {
      const errs = error.errors as Record<string, unknown>;
      const fieldPriority = [
        "vendor_invoice_number",
        "invoice_number",
        "total_amount",
        "invoice_date",
        "currency",
        "po_number",
        "due_date",
        "vendor_status",
        "send_to_option_id",
        "allocations",
        "status",
        "workflow",
        "reason",
      ];
      for (const field of fieldPriority) {
        const val = errs[field];
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") {
          return val[0] as string;
        }
      }
    }

    // Check specific field errors first (common in invoice operations)
    const fieldPriority = [
      "allocations",
      "status",
      "workflow",
      "reason",
      "vendor_invoice_number",
      "invoice_number",
    ];

    for (const field of fieldPriority) {
      if (error.errors[field]?.length) {
        return error.errors[field][0];
      }
    }

    // Fall back to general errors
    return (
      error.errors.detail?.[0] ??
      error.errors.non_field_errors?.[0] ??
      error.message ??
      fallback
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

/**
 * Shows a destructive toast with the extracted error message.
 * This is a convenience wrapper around the sonner toast function.
 */
export function showErrorToast(
  message: string,
  title = "Error"
): void {
  // Dynamic import to avoid circular dependency issues
  import("sonner").then(({ toast }) => {
    toast.error(title, {
      description: message,
    });
  });
}
