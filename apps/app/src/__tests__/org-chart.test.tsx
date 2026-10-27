import '@testing-library/jest-dom';
import { render } from '@lynx-js/react/testing-library';
import { memberSchema } from '@reviews/contracts';
import { expect, test } from '@rstest/core';
import { CompanyHome } from '../contexts/identity/screens/CompanyHome';
import { MemberScreen } from '../contexts/identity/screens/MemberScreen';
import { MyPlace } from '../contexts/identity/screens/MyPlace';
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
  {
    membershipId: 'cy',
    name: 'Cy',
    email: 'cy@demo.test',
    role: 'member',
    managerMembershipId: 'bea',
  },
  {
    membershipId: 'fay',
    name: 'Fay',
    email: 'fay@demo.test',
    role: 'member',
    managerMembershipId: null,
  },
]);

test('org chart names each report and offers an invite', async () => {
  const { findByText } = render(
    <CompanyHome
      companyName="Demo"
      actor={{ membershipId: 'ada', role: 'owner' }}
      members={members}
      pendingInvites={[]}
      onInvite={async () => []}
      onSetManager={async () => true}
      onSetRole={async () => true}
      onSignOut={() => undefined}
    />,
  );
  expect(await findByText('Bea')).toBeInTheDocument();
  expect(await findByText('Reports to Ada')).toBeInTheDocument();
  expect(await findByText('Invite')).toBeInTheDocument();
  expect(await findByText('Org chart')).toBeInTheDocument();
  expect(await findByText('Demo')).toBeInTheDocument();
});

test('onboarding asks for a company', async () => {
  const { findByText } = render(
    <Onboarding onCreate={async () => 'created'} onSignOut={() => undefined} />,
  );
  expect(await findByText('Step 1 of 2')).toBeInTheDocument();
  expect(await findByText('Create your company')).toBeInTheDocument();
  expect(await findByText('Create company')).toBeInTheDocument();
});

test('a member sees their own place', async () => {
  const { findByText, queryByText } = render(
    <MyPlace
      companyName="Demo"
      member={members[1]}
      managerName="Ada"
      onSignOut={() => undefined}
    />,
  );
  expect(await findByText('Your place')).toBeInTheDocument();
  expect(await findByText('Ada')).toBeInTheDocument();
  expect(queryByText('Invite')).toBeNull();
});

test('a member screen does not offer a report as manager', async () => {
  const { findByText, queryByText } = render(
    <MemberScreen
      member={members[1]}
      members={members}
      canSetRole
      canSetManager
      onBack={() => undefined}
      onSetManager={async () => true}
      onSetRole={async () => true}
    />,
  );
  expect(await findByText('Ada')).toBeInTheDocument();
  expect(await findByText('Make admin')).toBeInTheDocument();
  expect(queryByText('Cy')).toBeNull();
});
