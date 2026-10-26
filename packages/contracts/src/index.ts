import { z } from 'zod';

export const companyIdSchema = z.string().brand('CompanyId');
export const membershipIdSchema = z.string().brand('MembershipId');

export const companySchema = z.object({
  id: companyIdSchema,
  name: z.string(),
  slug: z.string(),
});

export type Company = z.infer<typeof companySchema>;

export const membershipRoleSchema = z.enum(['owner', 'admin', 'member']);

export const companyActorSchema = z.object({
  membershipId: membershipIdSchema,
  companyId: companyIdSchema,
  role: membershipRoleSchema,
});

export type CompanyActor = z.infer<typeof companyActorSchema>;
