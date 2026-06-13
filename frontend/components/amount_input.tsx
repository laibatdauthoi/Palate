type AmountInputProps = {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
};

export function AmountInput({ label, placeholder = "0.00 APT", value, onChange }: AmountInputProps) {
  return (
    <label className="amount_input">
      <span>{label}</span>
      <input className="input_control" inputMode="decimal" onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} value={value} />
    </label>
  );
}
