import type { Organization, ScopeNode } from "@/lib/types/core";

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function findPreferredOperationalOrg(
  organizations: Organization[],
): Organization | null {
  return (
    organizations.find((org) => {
      const name = normalize(org.name);
      const code = normalize(org.code);
      return name === "horizon" || code === "horizon";
    }) ??
    organizations[0] ??
    null
  );
}

export function findPreferredOperationalNode(nodes: ScopeNode[]): ScopeNode | null {
  return (
    nodes.find((node) => {
      const name = normalize(node.name);
      const code = normalize(node.code);
      return name === "marketing" || code === "marketing";
    }) ??
    nodes.find((node) => normalize(node.name).includes("marketing")) ??
    nodes[0] ??
    null
  );
}
