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
  companyName: z.string(),
  slug: z.string(),
});

export type CompanyActor = z.infer<typeof companyActorSchema>;

export const invitableRoleSchema = z.enum(['admin', 'member']);

export type InvitableRole = z.infer<typeof invitableRoleSchema>;

export const createCompanyBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const inviteBodySchema = z.object({
  email: z.email(),
  role: invitableRoleSchema,
});

export const invitationSchema = z.object({
  id: z.string(),
  email: z.email(),
  role: invitableRoleSchema,
  status: z.literal('pending'),
});

export const inviteConflictSchema = z.object({
  error: z.literal('conflict'),
  reason: z.enum(['member', 'invited']),
});

export const myInvitationSchema = invitationSchema.extend({
  companyName: z.string(),
});

export type Invitation = z.infer<typeof invitationSchema>;
export type MyInvitation = z.infer<typeof myInvitationSchema>;

export const setRoleBodySchema = z.object({
  role: invitableRoleSchema,
});

export const setManagerBodySchema = z.object({
  managerMembershipId: membershipIdSchema.nullable(),
});

export const memberSchema = z.object({
  membershipId: membershipIdSchema,
  name: z.string(),
  email: z.email(),
  role: membershipRoleSchema,
  managerMembershipId: membershipIdSchema.nullable(),
});

export type Member = z.infer<typeof memberSchema>;

export const userIdSchema = z.string().brand('UserId');

export const personalActorSchema = z.object({
  userId: userIdSchema,
});

export type PersonalActor = z.infer<typeof personalActorSchema>;

export const personalEmailBodySchema = z.object({
  email: z.email(),
});

export const personalCodeBodySchema = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6}$/),
});
