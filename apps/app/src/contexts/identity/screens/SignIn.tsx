import { Button } from '../../../ui/Button';
import { EmailField } from '../../../ui/EmailField';
import { PrimaryButton } from '../../../ui/PrimaryButton';

export function SignIn(props: {
  email: string;
  sent: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  return (
    <view className="flex flex-col justify-between p-6 min-h-screen bg-gray-100 text-gray-900">
      <view className="flex flex-col items-center mt-16">
        <view className="w-16 h-16 rounded-2xl bg-blue-600 items-center justify-center">
          <text className="text-2xl text-white font-semibold">R</text>
        </view>
        <text className="text-2xl font-semibold mt-4">Welcome to Reviews</text>
        <text className="text-base text-center mt-2 text-gray-600">
          Growth conversations your team actually looks forward to.
        </text>
      </view>
      {props.sent ? (
        <view className="bg-white rounded-2xl p-5 mb-8 items-center">
          <text className="text-lg font-semibold">Check your email</text>
          <text className="text-base text-center mt-2">
            We sent a sign-in link to {props.email}. Open it on this device.
          </text>
          <Button className="mt-4" onClick={props.onReset}>
            <text className="text-base text-blue-600">
              Use a different email
            </text>
          </Button>
        </view>
      ) : (
        <view className="mb-8">
          <text className="text-sm text-gray-500 mb-2">Work email</text>
          <EmailField value={props.email} onChange={props.onChange} />
          <view className="mt-3">
            <PrimaryButton onPress={props.onSubmit}>
              Send sign-in link
            </PrimaryButton>
          </view>
          <text className="text-sm text-center text-gray-500 mt-3">
            Using a personal email? You can link it after signing in.
          </text>
        </view>
      )}
    </view>
  );
}
