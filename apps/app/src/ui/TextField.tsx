import { Input } from '@lynx-js/lynx-ui';

type FieldType = 'text' | 'email';

export function TextField(props: {
  value: string;
  placeholder: string;
  type?: FieldType;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      className="border border-gray-300 rounded-xl px-3 py-3 text-base"
      placeholder={props.placeholder}
      type={props.type ?? 'text'}
      value={props.value}
      maxLength={props.maxLength}
      onInput={(value) => {
        'background only';
        props.onChange(value);
      }}
    />
  );
}
