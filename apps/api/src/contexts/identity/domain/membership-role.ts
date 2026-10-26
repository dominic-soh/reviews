export const membershipRoles = ['owner', 'admin', 'member'] as const;

export type MembershipRole = (typeof membershipRoles)[number];
