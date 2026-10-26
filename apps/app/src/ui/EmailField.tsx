export function EmailField(props: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      placeholder="Work email"
      default-value={props.value}
      bindinput={(event) => {
        'background only';
        props.onChange(event.detail.value);
      }}
    />
  );
}
