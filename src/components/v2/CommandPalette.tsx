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
import { Plus, UserPlus, Megaphone, BarChart3 } from "lucide-react";
import { NAV_ITEMS } from "@/lib/shell/nav";
import { useHotkey } from "@/lib/hooks/useHotkey";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface QuickAction {
  id: string;
  label: string;
  subtitle: string;
  icon: typeof Plus;
  path: string;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  useHotkey(["ctrl", "k"], () => onOpenChange(true));
  useHotkey(["meta", "k"], () => onOpenChange(true));

  const QUICK_ACTIONS: QuickAction[] = [
    { id: "new-invoice",     label: "New Invoice",      subtitle: "Create a new vendor invoice",    icon: Plus,     path: "/invoices" },
    { id: "invite-vendor",   label: "Invite Vendor",     subtitle: "Send vendor onboarding invite",  icon: UserPlus,  path: "/vendors" },
    { id: "create-campaign", label: "Create Campaign",  subtitle: "Start a new campaign",           icon: Megaphone, path: "/campaigns" },
    { id: "open-insights",   label: "Open Insights",    subtitle: "View analytics dashboard",        icon: BarChart3, path: "/insights" },
  ];

  const handleSelect = useCallback(
    (callback: () => void) => {
      callback();
      onOpenChange(false);
    },
    [onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages or actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((item) => (
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

        <CommandGroup heading="Actions">
          {QUICK_ACTIONS.map((action) => (
            <CommandItem
              key={action.id}
              value={action.label}
              onSelect={() => handleSelect(() => navigate(action.path))}
            >
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
              <span className="ml-2 text-xs text-muted-foreground">
                {action.subtitle}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
