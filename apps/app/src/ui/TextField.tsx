export function TextField(props: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      placeholder={props.placeholder}
      default-value={props.value}
      bindinput={(event) => {
        'background only';
        props.onChange(event.detail.value);
      }}
    />
  );
}
