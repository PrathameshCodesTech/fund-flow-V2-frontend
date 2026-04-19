import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Wallet, Users, Megaphone, CheckCircle2, BarChart3, ArrowRight, Command } from "lucide-react";

interface PageItem {
  id: string;
  title: string;
  subtitle: string;
  path: string;
  icon: typeof FileText;
}

// Only static page navigation — no hardcoded business records.
// Backend search API does not exist yet; searching is page-nav only.
const PAGES: PageItem[] = [
  { id: "p-1", title: "Dashboard", subtitle: "Marketing Fund Overview", path: "/", icon: BarChart3 },
  { id: "p-2", title: "Marketing Funds", subtitle: "FY budget & allocations", path: "/funds", icon: Wallet },
  { id: "p-3", title: "Vendor Bills", subtitle: "Invoice management", path: "/bills", icon: FileText },
  { id: "p-4", title: "Approvals", subtitle: "Pending approvals workflow", path: "/approvals", icon: CheckCircle2 },
  { id: "p-5", title: "Campaigns", subtitle: "Campaign tracking", path: "/campaigns", icon: Megaphone },
  { id: "p-6", title: "Partners", subtitle: "Vendor management", path: "/partners", icon: Users },
  { id: "p-7", title: "Insights", subtitle: "Analytics dashboard", path: "/insights", icon: BarChart3 },
  { id: "p-8", title: "Finance", subtitle: "Payments & disbursements", path: "/finance", icon: Wallet },
];

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const results = query.trim()
    ? PAGES.filter(p => fuzzyMatch(p.title, query) || fuzzyMatch(p.subtitle, query))
    : PAGES;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = useCallback((item: PageItem) => {
    navigate(item.path);
    setOpen(false);
  }, [navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  useEffect(() => { setSelectedIndex(0); }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-all min-w-[200px]"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Navigate…</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground border border-border/50">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        className="sm:hidden w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Search className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[60]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[61] w-[calc(100vw-2rem)] sm:w-full sm:max-w-lg"
            >
              <div className="bg-card border border-border rounded-2xl shadow-floating overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Navigate to a page…"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                  <kbd className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground border border-border/50">ESC</kbd>
                </div>

                <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
                  {results.length === 0 && (
                    <div className="py-12 text-center">
                      <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No pages match "{query}"</p>
                    </div>
                  )}
                  {results.length > 0 && (
                    <div>
                      <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Pages
                      </p>
                      {results.map((item, idx) => {
                        const isSelected = idx === selectedIndex;
                        return (
                          <div
                            key={item.id}
                            data-index={idx}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                              isSelected ? "bg-primary/8" : "hover:bg-secondary/50"
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isSelected ? "bg-primary/10" : "bg-secondary"
                            }`}>
                              <item.icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${isSelected ? "font-semibold text-foreground" : "text-foreground"}`}>{item.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                            </div>
                            {isSelected && <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border border-border/50 text-[10px]">↑↓</kbd> Navigate</span>
                  <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border border-border/50 text-[10px]">↵</kbd> Select</span>
                  <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border border-border/50 text-[10px]">esc</kbd> Close</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
