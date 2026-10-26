import { Button } from '@lynx-js/lynx-ui';
import type { ReactNode } from '@lynx-js/react';

export function PrimaryButton(props: {
  children: ReactNode;
  onPress: () => void;
}) {
  return (
    <Button className="px-4 py-2" onClick={props.onPress}>
      <text className="text-base">{props.children}</text>
    </Button>
  );
}
