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

export function isMarketingScopeNode(node: Pick<ScopeNode, "name" | "code">): boolean {
  const name = normalize(node.name);
  const code = normalize(node.code);
  return name === "marketing" || code === "marketing";
}

export function getNonMarketingScopeNodes(nodes: ScopeNode[]): ScopeNode[] {
  return nodes.filter((node) => !isMarketingScopeNode(node));
}

export function getRegionScopeNodes(nodes: ScopeNode[]): ScopeNode[] {
  return getNonMarketingScopeNodes(nodes).filter((node) => node.node_type === "region");
}

export function getBranchScopeNodes(nodes: ScopeNode[]): ScopeNode[] {
  return getNonMarketingScopeNodes(nodes).filter((node) => node.node_type === "branch");
}

export function getBudgetOwnerScopeNodes(nodes: ScopeNode[]): ScopeNode[] {
  const nonMarketingNodes = getNonMarketingScopeNodes(nodes);
  const branchNodes = nonMarketingNodes.filter((node) => node.node_type === "branch");
  const branchParentIds = new Set(
    branchNodes
      .map((node) => (node.parent === null || node.parent === undefined ? null : String(node.parent)))
      .filter((value): value is string => Boolean(value)),
  );
  const standaloneRegions = nonMarketingNodes.filter(
    (node) => node.node_type === "region" && !branchParentIds.has(String(node.id)),
  );

  if (branchNodes.length > 0 || standaloneRegions.length > 0) {
    return [...standaloneRegions, ...branchNodes];
  }

  const regionNodes = getRegionScopeNodes(nodes);
  if (regionNodes.length > 0) return regionNodes;

  return nonMarketingNodes;
}

export function findPreferredBudgetScopeNode(nodes: ScopeNode[]): ScopeNode | null {
  const budgetOwnerNodes = getBudgetOwnerScopeNodes(nodes);
  const preferredBranch = budgetOwnerNodes.find((node) => node.node_type === "branch");
  if (preferredBranch) return preferredBranch;

  return budgetOwnerNodes[0] ?? findPreferredOperationalNode(nodes);
}
