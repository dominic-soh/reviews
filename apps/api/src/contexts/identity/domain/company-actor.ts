import { type MembershipRole, membershipRoles } from './membership-role';

export type CompanyActor = {
  membershipId: string;
  companyId: string;
  role: MembershipRole;
  companyName: string;
  slug: string;
};

export function membershipRole(role: string): MembershipRole {
  for (const known of membershipRoles) {
    if (known === role) {
      return known;
    }
  }
  throw new Error(`unknown membership role ${role}`);
}
