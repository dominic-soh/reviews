import type { ReactNode } from '@lynx-js/react';
import { Button } from './Button';

export function PrimaryButton(props: {
  children: ReactNode;
  onPress: () => void;
}) {
  return (
    <Button
      className="px-4 py-3 rounded-xl bg-blue-600"
      onClick={props.onPress}
    >
      <text className="text-base text-white">{props.children}</text>
    </Button>
  );
}
