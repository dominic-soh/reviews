import { useState } from '@lynx-js/react';
import type { Member } from '@reviews/contracts';
import { EmailField } from '../../../ui/EmailField';
import { PrimaryButton } from '../../../ui/PrimaryButton';

function reportLine(member: Member, members: readonly Member[]): string {
  if (!member.managerMembershipId) {
    return member.name;
  }
  const manager = members.find(
    (person) => person.membershipId === member.managerMembershipId,
  );
  if (!manager) {
    return member.name;
  }
  return `${member.name} reports to ${manager.name}`;
}

export function CompanyHome(props: {
  companyId: string;
  members: readonly Member[];
  onInvite: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  return (
    <view className="p-4">
      <text className="text-lg">Reviews</text>
      <text className="text-base">My company</text>
      <text className="text-base">{props.companyId}</text>
      <text className="text-base">Invite</text>
      <EmailField value={email} onChange={setEmail} />
      <PrimaryButton
        onPress={() => {
          'background only';
          props.onInvite(email);
        }}
      >
        Send invite
      </PrimaryButton>
      <text className="text-base">People</text>
      {props.members.map((member) => (
        <view key={member.membershipId}>
          <text className="text-base">{reportLine(member, props.members)}</text>
        </view>
      ))}
    </view>
  );
}
