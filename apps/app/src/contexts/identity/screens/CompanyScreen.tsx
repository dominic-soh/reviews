import { useState } from '@lynx-js/react';
import type { InvitableRole } from '@reviews/contracts';
import { useQueryClient } from '@tanstack/react-query';
import {
  acceptInvite,
  createCompany,
  inviteMember,
  requestMagicLink,
  requestSignInCode,
  setManager,
  setMembershipRole,
  signOut,
  submitSignInCode,
  useCompanySession,
  useMembers,
  useMyInvites,
  usePendingInvites,
} from '../api/company';
import { CompanyHome } from './CompanyHome';
import type { InviteLine } from './InvitePeople';
import { InvitePeople } from './InvitePeople';
import { JoinInvite } from './JoinInvite';
import { MyPlace } from './MyPlace';
import { Onboarding } from './Onboarding';
import { SignIn, type SignInStep, signInCodeLength } from './SignIn';

function Loading() {
  return (
    <view className="p-6 min-h-screen bg-gray-100 text-gray-900">
      <text className="text-lg">Reviews</text>
    </view>
  );
}

export function CompanyScreen() {
  const session = useCompanySession();
  const state = session.data;
  const isCompany = state?.kind === 'company';
  const isOnboarding = state?.kind === 'onboarding';
  const canInvite = isCompany && state.actor.role !== 'member';
  const members = useMembers(isCompany);
  const pendingInvites = usePendingInvites(canInvite);
  const myInvites = useMyInvites(isOnboarding);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<SignInStep>('email');
  const [notice, setNotice] = useState('');
  const [setupInvite, setSetupInvite] = useState(false);

  function handleSignOut(): void {
    'background only';
    void signOut().then(async () => {
      setEmail('');
      setCode('');
      setStep('email');
      setNotice('');
      setSetupInvite(false);
      await queryClient.resetQueries();
    });
  }

  async function submitInvites(
    emails: string[],
    role: InvitableRole,
  ): Promise<InviteLine[]> {
    'background only';
    const lines: InviteLine[] = [];
    for (const address of emails) {
      const outcome = await inviteMember(address, role);
      lines.push({ email: address, outcome });
    }
    await queryClient.invalidateQueries({ queryKey: ['invites'] });
    return lines;
  }

  if (!state) {
    return <Loading />;
  }

  if (setupInvite && state.kind === 'company') {
    return (
      <InvitePeople
        step="2"
        closeLabel="Skip for now"
        onSubmit={submitInvites}
        onClose={() => {
          setSetupInvite(false);
        }}
      />
    );
  }

  if (isCompany && !members.isFetched) {
    return <Loading />;
  }

  switch (state.kind) {
    case 'company': {
      if (state.actor.role === 'member') {
        const people = members.data ?? [];
        const me = people.find(
          (person) => person.membershipId === state.actor.membershipId,
        );
        if (!me) {
          return (
            <view className="p-6">
              <text className="text-base">Could not load your place.</text>
            </view>
          );
        }
        const manager = people.find(
          (person) => person.membershipId === me.managerMembershipId,
        );
        return (
          <MyPlace
            companyName={state.actor.companyName}
            member={me}
            managerName={manager?.name ?? null}
            onSignOut={handleSignOut}
          />
        );
      }
      return (
        <CompanyHome
          companyName={state.actor.companyName}
          actor={{
            membershipId: state.actor.membershipId,
            role: state.actor.role,
          }}
          members={members.data ?? []}
          pendingInvites={pendingInvites.data ?? []}
          onInvite={submitInvites}
          onSetManager={async (membershipId, managerMembershipId) => {
            'background only';
            const ok = await setManager(membershipId, managerMembershipId);
            await queryClient.invalidateQueries({ queryKey: ['members'] });
            return ok;
          }}
          onSetRole={async (membershipId, role) => {
            'background only';
            const ok = await setMembershipRole(membershipId, role);
            await queryClient.invalidateQueries({ queryKey: ['members'] });
            return ok;
          }}
          onSignOut={handleSignOut}
        />
      );
    }
    case 'onboarding':
      if (!myInvites.isFetched) {
        return <Loading />;
      }
      if (myInvites.data && myInvites.data.length > 0) {
        return (
          <JoinInvite
            invites={myInvites.data}
            onAccept={async (invitationId) => {
              'background only';
              const ok = await acceptInvite(invitationId);
              await queryClient.invalidateQueries({
                queryKey: ['company-actor'],
              });
              await queryClient.invalidateQueries({ queryKey: ['my-invites'] });
              return ok;
            }}
            onSignOut={handleSignOut}
          />
        );
      }
      return (
        <Onboarding
          onCreate={async (name, slug) => {
            'background only';
            const result = await createCompany(name, slug);
            if (result !== 'created') {
              return result;
            }
            await queryClient.invalidateQueries({
              queryKey: ['company-actor'],
            });
            setSetupInvite(true);
            return result;
          }}
          onSignOut={handleSignOut}
        />
      );
    case 'signed-out':
      return (
        <SignIn
          email={email}
          code={code}
          step={step}
          notice={notice}
          onChange={setEmail}
          onCodeChange={setCode}
          onSubmitLink={() => {
            'background only';
            void requestMagicLink(email).then((sent) => {
              if (!sent) {
                setNotice('Could not send a link.');
                return;
              }
              setNotice('');
              setStep('link');
            });
          }}
          onRequestCode={() => {
            'background only';
            void requestSignInCode(email).then((sent) => {
              if (!sent) {
                setNotice('Could not send a code.');
                return;
              }
              setNotice('');
              setCode('');
              setStep('code');
            });
          }}
          onSubmitCode={() => {
            'background only';
            if (code.length !== signInCodeLength) {
              return;
            }
            void submitSignInCode(email, code).then(async (signedIn) => {
              if (!signedIn) {
                setNotice('That code did not work.');
                return;
              }
              setNotice('');
              await queryClient.invalidateQueries({
                queryKey: ['company-actor'],
              });
            });
          }}
          onReset={() => {
            setStep('email');
            setCode('');
            setNotice('');
          }}
        />
      );
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
