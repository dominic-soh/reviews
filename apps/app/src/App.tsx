import { PrimaryButton } from './ui/PrimaryButton';

export function App() {
  return (
    <view className="p-4">
      <text className="text-lg">Reviews</text>
      <PrimaryButton
        onPress={() => {
          'background only';
        }}
      >
        Continue
      </PrimaryButton>
    </view>
  );
}
