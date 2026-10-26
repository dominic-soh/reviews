import { memberSchema } from '@reviews/contracts';
import { expect, test } from '@rstest/core';
import {
  eligibleManagers,
  parseInviteDraft,
  slugFromName,
} from '../contexts/identity/screens/org';

const members = memberSchema.array().parse([
  {
    membershipId: 'ada',
    name: 'Ada',
    email: 'ada@demo.test',
    role: 'owner',
    managerMembershipId: null,
  },
  {
    membershipId: 'bea',
    name: 'Bea',
    email: 'bea@demo.test',
    role: 'member',
    managerMembershipId: 'ada',
  },
  {
    membershipId: 'cy',
    name: 'Cy',
    email: 'cy@demo.test',
    role: 'member',
    managerMembershipId: 'bea',
  },
]);

test('slug keeps letters, numbers, and single dashes', () => {
  expect(slugFromName('  Acme Robotics! ')).toBe('acme-robotics');
  expect(slugFromName('---')).toBe('');
});

test('invite draft drops blanks and stops at fifty', () => {
  const raw = [' ada@demo.test ', 'ada@demo.test', 'bea@demo.test', ''].join(
    '\n',
  );
  expect(parseInviteDraft(raw).emails).toEqual([
    'ada@demo.test',
    'bea@demo.test',
  ]);
  const many = Array.from({ length: 60 }, (_, index) => `p${index}@demo.test`);
  const parsed = parseInviteDraft(many.join('\n'));
  expect(parsed.emails).toHaveLength(50);
  expect(parsed.truncated).toBe(true);
});

test('a report is not an eligible manager', () => {
  expect(eligibleManagers(members, 'bea').map((person) => person.name)).toEqual(
    ['Ada'],
  );
});
