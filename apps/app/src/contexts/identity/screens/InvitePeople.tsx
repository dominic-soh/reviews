import { TextArea } from '@lynx-js/lynx-ui';
import { useState } from '@lynx-js/react';
import type { InvitableRole } from '@reviews/contracts';
import { Button } from '../../../ui/Button';
import { PrimaryButton } from '../../../ui/PrimaryButton';
import { type InviteOutcome, isInviteEmail } from '../api/company';
import { inviteBatchLimit, inviteOutcomeLabel, parseInviteDraft } from './org';

export type InviteLine = { email: string; outcome: InviteOutcome };

function roleHint(role: InvitableRole): string {
  switch (role) {
    case 'member':
      return 'Members see their own place on the team.';
    case 'admin':
      return 'Admins can invite people and set managers.';
    default: {
      const unreachable: never = role;
      return unreachable;
    }
  }
}

export function InvitePeople(props: {
  step: '2' | null;
  closeLabel: string;
  onSubmit: (emails: string[], role: InvitableRole) => Promise<InviteLine[]>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [role, setRole] = useState<InvitableRole>('member');
  const [results, setResults] = useState<InviteLine[] | null>(null);
  const [sending, setSending] = useState(false);
  const parsed = parseInviteDraft(draft);

  return (
    <view className="flex flex-col p-6 min-h-screen bg-gray-100 text-gray-900">
      {props.step === '2' ? (
        <text className="text-sm text-gray-500">Step 2 of 2</text>
      ) : null}
      <text className="text-2xl font-semibold mt-6">Invite your team</text>
      <text className="text-base text-gray-600 mt-2">
        Paste addresses, one per line. One role applies to the whole batch.
      </text>
      {results ? (
        <view className="mt-6">
          {results.map((line) => (
            <view key={line.email} className="py-2">
              <text className="text-base">
                {line.email} · {inviteOutcomeLabel(line.outcome)}
              </text>
            </view>
          ))}
          <view className="mt-6">
            <PrimaryButton onPress={props.onClose}>Done</PrimaryButton>
          </view>
        </view>
      ) : (
        <view className="mt-6">
          <TextArea
            className="border border-gray-300 rounded-xl p-3 text-base"
            style={{ minHeight: '140px' }}
            placeholder="name@company.com"
            maxLength={4000}
            value={draft}
            onInput={(value) => {
              setDraft(value);
            }}
          />
          {parsed.truncated ? (
            <text className="text-sm mt-2">
              Only the first {inviteBatchLimit} addresses will be invited.
            </text>
          ) : null}
          <view className="flex flex-row mt-4">
            <Button
              className="mr-2 px-4 py-2"
              onClick={() => setRole('member')}
            >
              <text
                className={role === 'member' ? 'font-semibold' : 'text-base'}
              >
                Member
              </text>
            </Button>
            <Button className="px-4 py-2" onClick={() => setRole('admin')}>
              <text
                className={role === 'admin' ? 'font-semibold' : 'text-base'}
              >
                Admin
              </text>
            </Button>
          </view>
          <text className="text-sm text-gray-500 mt-2">{roleHint(role)}</text>
          <view className="mt-6">
            <PrimaryButton
              onPress={() => {
                'background only';
                if (sending || parsed.emails.length === 0) {
                  return;
                }
                const invalid = parsed.emails
                  .filter((email) => !isInviteEmail(email))
                  .map((email) => ({ email, outcome: 'invalid' as const }));
                const valid = parsed.emails.filter((email) =>
                  isInviteEmail(email),
                );
                if (valid.length === 0) {
                  setResults(invalid);
                  return;
                }
                setSending(true);
                void props.onSubmit(valid, role).then((sent) => {
                  const byEmail = new Map(
                    sent.map((line) => [line.email, line]),
                  );
                  const merged = parsed.emails.flatMap((email) => {
                    const line = byEmail.get(email);
                    if (line) {
                      return [line];
                    }
                    const rejected = invalid.find((row) => row.email === email);
                    return rejected ? [rejected] : [];
                  });
                  setResults(merged);
                  setSending(false);
                });
              }}
            >
              Send invites
            </PrimaryButton>
          </view>
          <view className="mt-3">
            <Button onClick={props.onClose}>
              <text className="text-base text-gray-600">
                {props.closeLabel}
              </text>
            </Button>
          </view>
        </view>
      )}
    </view>
  );
}
