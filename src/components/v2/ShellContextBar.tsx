import type { ReactNode } from "react";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface ShellContextBarProps {
  title: string;
  titleIcon?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  orgSelector?: ReactNode;
  unitSelector?: ReactNode;
  actions?: ReactNode;
}

export function ShellContextBar({
  title,
  titleIcon,
  breadcrumbs,
  orgSelector,
  unitSelector,
  actions,
}: ShellContextBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-2.5">
      {/* Left: icon + title + breadcrumb chain + org/unit selectors */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        {titleIcon ? <span className="shrink-0">{titleIcon}</span> : null}
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-base font-semibold truncate">{title}</h1>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <>
              <span className="shrink-0 text-muted-foreground">/</span>
              <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex min-w-0 items-center gap-1">
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="truncate hover:text-foreground transition-colors"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="truncate">{crumb.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 && <span className="shrink-0">/</span>}
                  </span>
                ))}
              </nav>
            </>
          )}
        </div>
        {orgSelector ? <div className="shrink-0">{orgSelector}</div> : null}
        {unitSelector ? <div className="shrink-0">{unitSelector}</div> : null}
      </div>

      {/* Right: page actions only */}
      <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2">
        {actions}
      </div>
    </div>
  );
}
