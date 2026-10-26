import { useEffect, useState } from '@lynx-js/react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../../app/session';
import { EmailField } from '../../../ui/EmailField';
import { PrimaryButton } from '../../../ui/PrimaryButton';
import {
  createCompany,
  inviteMember,
  requestMagicLink,
  useCompanySession,
  useMembers,
} from '../api/company';
import { CompanyHome } from './CompanyHome';
import { Onboarding } from './Onboarding';

export function CompanyScreen() {
  const session = useCompanySession();
  const members = useMembers(session.data?.kind === 'company');
  const queryClient = useQueryClient();
  const setCompanyName = useSession((state) => state.setCompanyName);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const state = session.data;

  useEffect(() => {
    const companyId = state?.kind === 'company' ? state.actor.companyId : null;
    setCompanyName(companyId);
  }, [state, setCompanyName]);

  if (!state) {
    return (
      <view className="p-4">
        <text className="text-lg">Reviews</text>
      </view>
    );
  }

  switch (state.kind) {
    case 'company':
      return (
        <CompanyHome
          companyId={state.actor.companyId}
          members={members.data ?? []}
          onInvite={(address) => {
            'background only';
            void inviteMember(address).then(() =>
              queryClient.invalidateQueries({ queryKey: ['members'] }),
            );
          }}
        />
      );
    case 'onboarding':
      return (
        <Onboarding
          onCreate={(name, slug) => {
            'background only';
            void createCompany(name, slug).then(() =>
              queryClient.invalidateQueries({ queryKey: ['company-actor'] }),
            );
          }}
        />
      );
    case 'signed-out':
      return (
        <view className="p-4">
          <text className="text-lg">Reviews</text>
          <text className="text-base">Sign in</text>
          <EmailField value={email} onChange={setEmail} />
          <PrimaryButton
            onPress={() => {
              'background only';
              void requestMagicLink(email).then(setSent);
            }}
          >
            Send link
          </PrimaryButton>
          {sent ? <text className="text-base">Check your email</text> : null}
        </view>
      );
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
