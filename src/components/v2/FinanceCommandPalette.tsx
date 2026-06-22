import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { LayoutDashboard, FileText, Users, Inbox } from "lucide-react";
import { useHotkey } from "@/lib/hooks/useHotkey";

interface FinanceCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Finance-only navigation items
const FINANCE_NAV_ITEMS = [
  { label: "Finance Dashboard", to: "/finance", icon: LayoutDashboard },
  { label: "Invoice Reviews", to: "/finance/invoices", icon: FileText },
  { label: "Vendor Reviews", to: "/finance/vendors", icon: Users },
  { label: "Document Ingestion", to: "/finance/document-ingestion", icon: Inbox },
];

export function FinanceCommandPalette({ open, onOpenChange }: FinanceCommandPaletteProps) {
  const navigate = useNavigate();

  useHotkey(["ctrl", "k"], () => onOpenChange(true));
  useHotkey(["meta", "k"], () => onOpenChange(true));

  const handleSelect = useCallback(
    (callback: () => void) => {
      callback();
      onOpenChange(false);
    },
    [onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search finance pages…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {FINANCE_NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.to}
              value={item.label}
              onSelect={() => handleSelect(() => navigate(item.to))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
