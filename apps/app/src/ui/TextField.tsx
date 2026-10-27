import { useContext } from '@lynx-js/react';
import { KeyboardAwareTriggerContext } from '@lynx-js/lynx-ui';

type FieldType = 'text' | 'email';

export function TextField(props: {
  value: string;
  placeholder: string;
  type?: FieldType;
  onChange: (value: string) => void;
}) {
  const keyboard = useContext(KeyboardAwareTriggerContext);
  return (
    <input
      className="border border-gray-300 rounded-xl px-3 py-3 text-base"
      placeholder={props.placeholder}
      type={props.type ?? 'text'}
      default-value={props.value}
      bindfocus={() => {
        'background only';
        keyboard.onInputFocused?.();
      }}
      bindblur={() => {
        'background only';
        keyboard.onInputBlurred?.();
      }}
      bindinput={(event) => {
        'background only';
        props.onChange(event.detail.value);
      }}
    />
  );
}
