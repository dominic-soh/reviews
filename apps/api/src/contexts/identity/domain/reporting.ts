export type ReportingEdge = {
  membershipId: string;
  managerMembershipId: string;
};

export function managerCreatesCycle(
  lines: readonly ReportingEdge[],
  membershipId: string,
  managerMembershipId: string,
): boolean {
  const managerOf = new Map(
    lines.map((line) => [line.membershipId, line.managerMembershipId]),
  );
  const seen = new Set<string>();
  let current: string | undefined = managerMembershipId;
  while (current) {
    if (current === membershipId || seen.has(current)) {
      return true;
    }
    seen.add(current);
    current = managerOf.get(current);
  }
  return false;
}
