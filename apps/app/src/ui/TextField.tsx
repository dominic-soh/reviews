export function TextField(props: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="border border-gray-300 rounded-xl px-3 py-3 text-base"
      placeholder={props.placeholder}
      default-value={props.value}
      bindinput={(event) => {
        'background only';
        props.onChange(event.detail.value);
      }}
    />
  );
}
