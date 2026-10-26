import type { MembershipRole } from './membership-role';

const owner: MembershipRole = 'owner';

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
