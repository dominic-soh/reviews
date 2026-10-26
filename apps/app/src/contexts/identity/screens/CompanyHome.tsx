import { useState } from '@lynx-js/react';
import type { InvitableRole, Invitation, Member } from '@reviews/contracts';
import { Button } from '../../../ui/Button';
import { type InviteLine, InvitePeople } from './InvitePeople';
import { MemberScreen } from './MemberScreen';
import { initials, reportLine, roleLabel } from './org';

type DirectoryTab = 'team' | 'org';

type Panel =
  | { kind: 'directory' }
  | { kind: 'invite' }
  | { kind: 'member'; membershipId: string };

function placeLine(role: 'owner' | 'admin', count: number): string {
  switch (role) {
    case 'owner':
      return `${count} people · you're the owner`;
    case 'admin':
      return `${count} people · you're an admin`;
    default: {
      const unreachable: never = role;
      return unreachable;
    }
  }
}

function PersonRow(props: {
  member: Member;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Button onClick={props.onPress}>
      <view className="flex flex-row items-center py-3">
        <view className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mr-3">
          <text className="text-sm font-semibold">
            {initials(props.member.name)}
          </text>
        </view>
        <view className="flex flex-col">
          <view className="flex flex-row">
            <text className="text-base font-semibold">{props.member.name}</text>
            {props.member.role === 'member' ? null : (
              <text className="text-sm ml-2">
                {roleLabel(props.member.role)}
              </text>
            )}
          </view>
          <text className="text-sm text-gray-500">{props.subtitle}</text>
        </view>
      </view>
    </Button>
  );
}

function OrgNode(props: {
  member: Member;
  members: readonly Member[];
  onOpen: (membershipId: string) => void;
}) {
  const reports = props.members.filter(
    (person) => person.managerMembershipId === props.member.membershipId,
  );
  const subtitle =
    reports.length > 0
      ? `${reports.length} direct reports`
      : props.member.email;
  return (
    <view className="flex flex-col">
      <PersonRow
        member={props.member}
        subtitle={subtitle}
        onPress={() => props.onOpen(props.member.membershipId)}
      />
      {reports.length > 0 ? (
        <view className="pl-4 ml-4 border-l border-gray-200">
          {reports.map((report) => (
            <OrgNode
              key={report.membershipId}
              member={report}
              members={props.members}
              onOpen={props.onOpen}
            />
          ))}
        </view>
      ) : null}
    </view>
  );
}

export function CompanyHome(props: {
  companyName: string;
  actor: { membershipId: string; role: 'owner' | 'admin' };
  members: readonly Member[];
  pendingInvites: readonly Invitation[];
  onInvite: (emails: string[], role: InvitableRole) => Promise<InviteLine[]>;
  onSetManager: (
    membershipId: string,
    managerMembershipId: string | null,
  ) => Promise<boolean>;
  onSetRole: (
    membershipId: string,
    role: 'admin' | 'member',
  ) => Promise<boolean>;
}) {
  const [tab, setTab] = useState<DirectoryTab>('team');
  const [panel, setPanel] = useState<Panel>({ kind: 'directory' });
  const unassigned = props.members.filter(
    (member) => member.managerMembershipId === null && member.role !== 'owner',
  );
  const roots = props.members.filter(
    (member) => member.managerMembershipId === null && member.role === 'owner',
  );

  switch (panel.kind) {
    case 'invite':
      return (
        <InvitePeople
          step={null}
          closeLabel="Cancel"
          onSubmit={props.onInvite}
          onClose={() => setPanel({ kind: 'directory' })}
        />
      );
    case 'member': {
      const member = props.members.find(
        (person) => person.membershipId === panel.membershipId,
      );
      if (!member) {
        return (
          <view className="p-6">
            <text className="text-base">That person is no longer here.</text>
            <Button onClick={() => setPanel({ kind: 'directory' })}>
              <text className="text-base">Team</text>
            </Button>
          </view>
        );
      }
      return (
        <MemberScreen
          member={member}
          members={props.members}
          canSetRole={props.actor.role === 'owner'}
          canSetManager
          onBack={() => setPanel({ kind: 'directory' })}
          onSetManager={(managerMembershipId) =>
            props.onSetManager(member.membershipId, managerMembershipId)
          }
          onSetRole={(role) => props.onSetRole(member.membershipId, role)}
        />
      );
    }
    case 'directory':
      return (
        <view className="flex flex-col min-h-screen bg-gray-100 text-gray-900">
          <view className="p-6 pb-3">
            <view className="flex flex-row items-center justify-between">
              <view className="flex flex-col">
                <text className="text-2xl font-semibold">
                  {props.companyName}
                </text>
                <text className="text-sm text-gray-500 mt-1">
                  {placeLine(props.actor.role, props.members.length)}
                </text>
              </view>
              <Button onClick={() => setPanel({ kind: 'invite' })}>
                <text className="text-base text-blue-600 font-semibold">
                  Invite
                </text>
              </Button>
            </view>
          </view>
          <view className="flex flex-row px-6 border-b border-gray-200">
            <Button onClick={() => setTab('team')}>
              <text
                className={
                  tab === 'team'
                    ? 'font-semibold py-3 mr-6'
                    : 'text-gray-500 py-3 mr-6'
                }
              >
                Team
              </text>
            </Button>
            <Button onClick={() => setTab('org')}>
              <text
                className={
                  tab === 'org' ? 'font-semibold py-3' : 'text-gray-500 py-3'
                }
              >
                Org chart
              </text>
            </Button>
          </view>
          <view className="p-4">
            {props.members.length === 1 ? (
              <view className="bg-white rounded-2xl p-5 items-center">
                <text className="text-lg font-semibold">
                  It's just you so far
                </text>
                <text className="text-base text-center text-gray-600 mt-2">
                  Invite your team to start building ladders and running
                  reviews.
                </text>
              </view>
            ) : null}
            {tab === 'team' ? (
              <view className="bg-white rounded-2xl px-4 mt-3">
                {props.members.map((member) => (
                  <PersonRow
                    key={member.membershipId}
                    member={member}
                    subtitle={reportLine(member, props.members)}
                    onPress={() =>
                      setPanel({
                        kind: 'member',
                        membershipId: member.membershipId,
                      })
                    }
                  />
                ))}
              </view>
            ) : (
              <view className="mt-3">
                <view className="bg-white rounded-2xl px-4">
                  {roots.map((member) => (
                    <OrgNode
                      key={member.membershipId}
                      member={member}
                      members={props.members}
                      onOpen={(membershipId) =>
                        setPanel({ kind: 'member', membershipId })
                      }
                    />
                  ))}
                </view>
                {unassigned.length > 0 ? (
                  <view className="mt-4">
                    <text className="text-sm font-semibold mb-2">
                      Needs a manager · {unassigned.length}
                    </text>
                    <view className="bg-white rounded-2xl px-4">
                      {unassigned.map((member) => (
                        <PersonRow
                          key={member.membershipId}
                          member={member}
                          subtitle="Tap to assign a manager"
                          onPress={() =>
                            setPanel({
                              kind: 'member',
                              membershipId: member.membershipId,
                            })
                          }
                        />
                      ))}
                    </view>
                  </view>
                ) : null}
              </view>
            )}
            {props.pendingInvites.length > 0 ? (
              <view className="mt-4">
                <text className="text-sm font-semibold mb-2">
                  Pending · {props.pendingInvites.length}
                </text>
                <view className="bg-white rounded-2xl px-4 py-2">
                  {props.pendingInvites.map((invite) => (
                    <text key={invite.id} className="text-base py-2">
                      {invite.email} · {roleLabel(invite.role)}
                    </text>
                  ))}
                </view>
              </view>
            ) : null}
          </view>
        </view>
      );
    default: {
      const unreachable: never = panel;
      return unreachable;
    }
  }
}
