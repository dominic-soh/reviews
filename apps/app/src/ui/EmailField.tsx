import { TextField } from './TextField';

export function EmailField(props: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextField
      value={props.value}
      placeholder="Work email"
      type="email"
      maxLength={254}
      onChange={props.onChange}
    />
  );
}
