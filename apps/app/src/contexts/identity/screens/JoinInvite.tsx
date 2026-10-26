import { useEffect, useState } from '@lynx-js/react';
import type { MyInvitation } from '@reviews/contracts';
import { PrimaryButton } from '../../../ui/PrimaryButton';

type JoinPhase = 'idle' | 'joining' | 'failed';

export function JoinInvite(props: {
  invites: readonly MyInvitation[];
  onAccept: (invitationId: string) => Promise<boolean>;
}) {
  const { invites, onAccept } = props;
  const only = invites.length === 1 ? invites[0] : null;
  const [phase, setPhase] = useState<JoinPhase>('idle');

  useEffect(() => {
    if (!only || phase !== 'idle') {
      return;
    }
    setPhase('joining');
    void onAccept(only.id).then((ok) => {
      if (!ok) {
        setPhase('failed');
      }
    });
  }, [only, onAccept, phase]);

  if (only) {
    return (
      <view className="flex flex-col p-6 min-h-screen bg-gray-100 text-gray-900">
        <text className="text-2xl font-semibold mt-16">
          Joining {only.companyName}
        </text>
        <text className="text-base text-gray-600 mt-2">
          {phase === 'failed'
            ? 'This invitation could not be accepted.'
            : `Accepting your invite to ${only.companyName}.`}
        </text>
        {phase === 'failed' ? (
          <view className="mt-8">
            <PrimaryButton
              onPress={() => {
                'background only';
                setPhase('joining');
                void onAccept(only.id).then((ok) => {
                  if (!ok) {
                    setPhase('failed');
                  }
                });
              }}
            >
              Try again
            </PrimaryButton>
          </view>
        ) : null}
      </view>
    );
  }

  return (
    <view className="flex flex-col p-6 min-h-screen bg-gray-100 text-gray-900">
      <text className="text-2xl font-semibold mt-16">You've been invited</text>
      <text className="text-base text-gray-600 mt-2">
        Choose the company you want to join.
      </text>
      {invites.map((invite) => (
        <view key={invite.id} className="mt-4">
          <PrimaryButton
            onPress={() => {
              'background only';
              void onAccept(invite.id);
            }}
          >
            Join {invite.companyName}
          </PrimaryButton>
        </view>
      ))}
    </view>
  );
}
