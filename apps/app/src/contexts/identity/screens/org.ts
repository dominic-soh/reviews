import type { Member } from '@reviews/contracts';
import type { InviteOutcome } from '../api/company';

export const inviteBatchLimit = 50;

export type ReportingEdge = {
  membershipId: string;
  managerMembershipId: string;
};

export function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseInviteDraft(raw: string): {
  emails: string[];
  truncated: boolean;
} {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const email = part.trim().toLowerCase();
    if (email.length === 0 || seen.has(email)) {
      continue;
    }
    seen.add(email);
    emails.push(email);
  }
  return {
    emails: emails.slice(0, inviteBatchLimit),
    truncated: emails.length > inviteBatchLimit,
  };
}

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

export function eligibleManagers(
  members: readonly Member[],
  membershipId: string,
): Member[] {
  const lines = members.flatMap((member) => {
    if (member.managerMembershipId === null) {
      return [];
    }
    if (member.membershipId === membershipId) {
      return [];
    }
    return [
      {
        membershipId: member.membershipId,
        managerMembershipId: member.managerMembershipId,
      },
    ];
  });
  return members.filter((candidate) => {
    if (candidate.membershipId === membershipId) {
      return false;
    }
    return !managerCreatesCycle(lines, membershipId, candidate.membershipId);
  });
}

export function reportLine(member: Member, members: readonly Member[]): string {
  if (member.managerMembershipId === null) {
    switch (member.role) {
      case 'owner':
        return member.email;
      case 'admin':
      case 'member':
        return 'No manager';
      default: {
        const unreachable: never = member.role;
        return unreachable;
      }
    }
  }
  const manager = members.find(
    (person) => person.membershipId === member.managerMembershipId,
  );
  if (!manager) {
    return 'No manager';
  }
  return `Reports to ${manager.name}`;
}

export function inviteOutcomeLabel(outcome: InviteOutcome): string {
  switch (outcome) {
    case 'invited':
      return 'Invited';
    case 'already-member':
      return 'Already on the team';
    case 'already-invited':
      return 'Already invited';
    case 'invalid':
      return 'Not a valid email';
    case 'failed':
      return 'Could not invite';
    default: {
      const unreachable: never = outcome;
      return unreachable;
    }
  }
}

export function initials(name: string): string {
  const letters = name
    .split(' ')
    .filter((part) => part.length > 0)
    .map((part) => part.slice(0, 1))
    .join('');
  return letters.slice(0, 2).toUpperCase();
}

export function roleLabel(role: Member['role']): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    case 'member':
      return 'Member';
    default: {
      const unreachable: never = role;
      return unreachable;
    }
  }
}

export function nextRole(role: 'admin' | 'member'): {
  role: 'admin' | 'member';
  label: string;
} {
  switch (role) {
    case 'member':
      return { role: 'admin', label: 'Make admin' };
    case 'admin':
      return { role: 'member', label: 'Make member' };
    default: {
      const unreachable: never = role;
      return unreachable;
    }
  }
}
