import { useState, useRef, useEffect } from "react";
import { useUser, useUsers } from "@/lib/hooks/useV2Users";
import { getUserFullName, type V2User } from "@/lib/types/v2user";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface UserPickerProps {
  value: string | null;
  onChange: (userId: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export function UserPicker({
  value,
  onChange,
  label = "Select User",
  placeholder = "Search by name or email...",
  disabled = false,
  error,
}: UserPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: users = [], isLoading, isError } = useUsers(
    query.length >= 1 ? { q: query } : undefined,
  );
  const { data: selectedUser } = useUser(value);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleSelect = (user: V2User) => {
    onChange(user.id);
    setQuery(getUserFullName(user));
    setOpen(false);
  };

  return (
    <div className="relative space-y-1.5" ref={wrapperRef}>
      {label && <Label>{label}</Label>}

      <div className="relative">
        <Input
          placeholder={placeholder}
          value={
            open
              ? query
              : (() => {
                  const selected = users.find((u) => u.id === value) ?? selectedUser;
                  return selected ? getUserFullName(selected) : "";
                })()
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled || isLoading}
          className="pr-8"
        />
        {isLoading && (
          <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-muted-foreground pointer-events-none" />
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Dropdown — shown when open and there are results or loading */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full min-w-72 rounded-lg border border-border bg-background shadow-md max-h-64 overflow-y-auto">
          {isError && (
            <div className="p-3 text-xs text-destructive">
              Failed to load users.
            </div>
          )}
          {!isError && users.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground">
              {query ? "No users match your search." : "Type to search users."}
            </div>
          )}
          {!isError && users.length > 0 && (
            <div className="py-1">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                >
                  <span className="font-medium">
                    {getUserFullName(user)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                    {!user.is_active && (
                      <span className="ml-1.5 text-orange-500">(inactive)</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
