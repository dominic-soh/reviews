import type { MembershipRole } from './membership-role';

const owner: MembershipRole = 'owner';
const seededAt = new Date('2026-01-01T00:00:00.000Z');

export const demoCompany = {
  id: 'company_demo',
  name: 'Demo',
  slug: 'demo',
};

export const demoUser = {
  id: 'user_demo',
  email: 'ada@demo.test',
  name: 'Ada Demo',
};

export const demoMembership = {
  id: 'membership_demo',
  companyId: demoCompany.id,
  userId: demoUser.id,
  role: owner,
};

export const demoAuthUser = {
  id: 'user_auth_demo',
  name: demoUser.name,
  email: demoUser.email,
  emailVerified: true,
  createdAt: seededAt,
  updatedAt: seededAt,
};

export const demoOrganization = {
  id: demoCompany.id,
  name: demoCompany.name,
  slug: demoCompany.slug,
  createdAt: seededAt,
};

export const demoAuthMember = {
  id: demoMembership.id,
  organizationId: demoCompany.id,
  userId: demoAuthUser.id,
  role: owner,
  createdAt: seededAt,
};
