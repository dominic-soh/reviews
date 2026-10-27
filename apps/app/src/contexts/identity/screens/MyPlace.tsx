import type { Member } from '@reviews/contracts';
import { Button } from '../../../ui/Button';
import { roleLabel } from './org';

export function MyPlace(props: {
  companyName: string;
  member: Member;
  managerName: string | null;
  onSignOut: () => void;
}) {
  const manager = props.managerName ?? 'No manager yet';
  return (
    <view className="flex flex-col p-6 min-h-screen bg-gray-100 text-gray-900">
      <text className="text-sm text-gray-500">{props.companyName}</text>
      <text className="text-2xl font-semibold mt-2">Your place</text>
      <view className="bg-white rounded-2xl p-4 mt-6">
        <text className="text-lg font-semibold">{props.member.name}</text>
        <text className="text-base text-gray-600 mt-1">
          {props.member.email}
        </text>
        <text className="text-base mt-3">{roleLabel(props.member.role)}</text>
        <text className="text-base text-gray-600 mt-1">{manager}</text>
      </view>
      <view className="mt-6">
        <Button onClick={props.onSignOut}>
          <text className="text-sm text-gray-500">Sign out</text>
        </Button>
      </view>
    </view>
  );
}
