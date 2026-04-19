import { useState, useRef, useEffect } from "react";
import { useScopeNodes } from "@/lib/hooks/useScopeNodes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface MultiSelectUnitsProps {
  value: string[];
  onChange: (ids: string[]) => void;
  orgId?: string;
  label?: string;
  placeholder?: string;
  error?: string;
}

export function MultiSelectUnits({
  value,
  onChange,
  orgId,
  label = "Select Units",
  placeholder = "Select units...",
  error,
}: MultiSelectUnitsProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { data: allNodes = [] } = useScopeNodes(orgId);

  const selectedNodes = allNodes.filter((n) => value.includes(n.id));

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function toggleNode(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  function removeNode(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div className="relative space-y-1.5" ref={wrapperRef}>
      {label && <Label>{label}</Label>}

      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between h-auto min-h-[40px] py-1.5 px-3 flex-wrap gap-1"
          >
            {selectedNodes.length === 0 ? (
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {selectedNodes.map((n) => (
                  <Badge
                    key={n.id}
                    variant="secondary"
                    className="text-xs gap-1 pl-1.5 pr-1"
                  >
                    {n.name}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNode(n.id);
                      }}
                      className="ml-0.5 hover:text-destructive rounded-sm outline-none focus:ring-1 focus:ring-ring"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </Button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={8}
          className="w-[320px] p-0 border bg-popover text-popover-foreground shadow-md rounded-md outline-none z-[9999]"
        >
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Filter units..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ScrollArea className="max-h-[240px]">
            {allNodes.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No units found
              </div>
            ) : (
              <div className="p-1">
                {allNodes
                  .filter((n) =>
                    n.name.toLowerCase().includes(query.toLowerCase())
                  )
                  .map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => toggleNode(n.id)}
                      className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent outline-none cursor-pointer"
                    >
                      <Checkbox
                        checked={value.includes(n.id)}
                        onCheckedChange={() => toggleNode(n.id)}
                        className="pointer-events-none"
                      />
                      <span className="truncate">{n.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </ScrollArea>
          <div className="p-2 border-t text-xs text-muted-foreground text-center">
            {value.length === 0
              ? "No units selected"
              : `${value.length} unit${value.length !== 1 ? "s" : ""} selected`}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Root>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
