import { useEffect, useState } from '@lynx-js/react';
import { useSession } from '../../../app/session';
import { EmailField } from '../../../ui/EmailField';
import { PrimaryButton } from '../../../ui/PrimaryButton';
import { requestMagicLink, useCompanyActor } from '../api/company';

export function CompanyScreen() {
  const actor = useCompanyActor();
  const setCompanyName = useSession((state) => state.setCompanyName);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setCompanyName(actor.data?.companyId ?? null);
  }, [actor.data, setCompanyName]);

  if (actor.data) {
    return (
      <view className="p-4">
        <text className="text-lg">Reviews</text>
        <text className="text-base">My company</text>
        <text className="text-base">{actor.data.companyId}</text>
      </view>
    );
  }

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
}
