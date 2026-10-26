import { useState } from '@lynx-js/react';
import type { Member } from '@reviews/contracts';
import { Button } from '../../../ui/Button';
import { eligibleManagers, nextRole, roleLabel } from './org';

export function MemberScreen(props: {
  member: Member;
  members: readonly Member[];
  canSetRole: boolean;
  canSetManager: boolean;
  onBack: () => void;
  onSetManager: (managerMembershipId: string | null) => Promise<boolean>;
  onSetRole: (role: 'admin' | 'member') => Promise<boolean>;
}) {
  const [error, setError] = useState<string | null>(null);
  const managers = eligibleManagers(props.members, props.member.membershipId);
  const managerName =
    props.members.find(
      (person) => person.membershipId === props.member.managerMembershipId,
    )?.name ?? 'No manager';
  const roleChange =
    props.canSetRole && props.member.role !== 'owner'
      ? nextRole(props.member.role)
      : null;

  return (
    <view className="flex flex-col p-6 min-h-screen bg-gray-100 text-gray-900">
      <Button onClick={props.onBack}>
        <text className="text-base text-blue-600">Team</text>
      </Button>
      <text className="text-2xl font-semibold mt-4">{props.member.name}</text>
      <text className="text-base text-gray-600 mt-1">{props.member.email}</text>
      <text className="text-base mt-2">{roleLabel(props.member.role)}</text>
      {roleChange ? (
        <view className="mt-4">
          <Button
            onClick={() => {
              'background only';
              void props.onSetRole(roleChange.role).then((ok) => {
                setError(ok ? null : 'Could not change the role.');
              });
            }}
          >
            <text className="text-base">{roleChange.label}</text>
          </Button>
        </view>
      ) : null}
      <text className="text-sm text-gray-500 mt-8">Manager</text>
      {props.canSetManager ? (
        <view className="mt-2">
          <Button
            onClick={() => {
              'background only';
              void props.onSetManager(null).then((ok) => {
                setError(ok ? null : 'Could not update the manager.');
              });
            }}
          >
            <text className="text-base">No manager</text>
          </Button>
          {managers.map((manager) => (
            <view key={manager.membershipId} className="mt-2">
              <Button
                onClick={() => {
                  'background only';
                  void props.onSetManager(manager.membershipId).then((ok) => {
                    setError(ok ? null : 'Could not update the manager.');
                  });
                }}
              >
                <text className="text-base">{manager.name}</text>
                {props.member.managerMembershipId === manager.membershipId ? (
                  <text className="text-sm">Current</text>
                ) : null}
              </Button>
            </view>
          ))}
        </view>
      ) : (
        <text className="text-base mt-2">{managerName}</text>
      )}
      {error ? <text className="text-base mt-4">{error}</text> : null}
    </view>
  );
}
