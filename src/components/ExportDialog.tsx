import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Info } from "lucide-react";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  type: "budget" | "invoices" | "approvals";
}

/**
 * ExportDialog — export API not yet implemented.
 *
 * This dialog intentionally shows an "unavailable" state rather than
 * simulating a fake export. When a backend export/report API is available,
 * replace the body with real format/filter/download controls.
 */
export function ExportDialog({ open, onClose, title }: ExportDialogProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[50]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[51] w-[calc(100vw-2rem)] sm:max-w-sm"
      >
        <div className="bg-card border border-border rounded-2xl shadow-floating overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-card-title">Export {title}</h3>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <Info className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Export not available yet</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The export/report API is not implemented in this version.
                This feature will be available in a future release.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
