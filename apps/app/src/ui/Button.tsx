import { Button as LynxButton } from '@lynx-js/lynx-ui';
import type { ReactNode } from '@lynx-js/react';

function interactionClass(disabled: boolean): string {
  if (disabled) {
    return 'cursor-not-allowed opacity-40';
  }
  return 'cursor-pointer hover:opacity-90';
}

export function Button(props: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const disabled = props.disabled ?? false;
  const className = [interactionClass(disabled), props.className]
    .filter((value) => value && value.length > 0)
    .join(' ');
  return (
    <LynxButton
      className={className}
      disabled={disabled}
      onClick={props.onClick}
      buttonProps={{ focusable: !disabled }}
    >
      {props.children}
    </LynxButton>
  );
}
