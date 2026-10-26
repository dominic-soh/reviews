import '@testing-library/jest-dom';
import { render } from '@lynx-js/react/testing-library';
import { memberSchema } from '@reviews/contracts';
import { expect, test } from '@rstest/core';
import { CompanyHome } from '../contexts/identity/screens/CompanyHome';
import { Onboarding } from '../contexts/identity/screens/Onboarding';

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
]);

test('org chart names each report and offers an invite', async () => {
  const { findByText } = render(
    <CompanyHome
      companyId="company_demo"
      members={members}
      onInvite={() => undefined}
    />,
  );
  expect(await findByText('Bea reports to Ada')).toBeInTheDocument();
  expect(await findByText('Ada')).toBeInTheDocument();
  expect(await findByText('Invite')).toBeInTheDocument();
  expect(await findByText('People')).toBeInTheDocument();
});

test('onboarding asks for a company', async () => {
  const { findByText } = render(<Onboarding onCreate={() => undefined} />);
  expect(await findByText('Create your company')).toBeInTheDocument();
  expect(await findByText('Create company')).toBeInTheDocument();
});
