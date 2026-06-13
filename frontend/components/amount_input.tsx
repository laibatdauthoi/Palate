type AmountInputProps = {
  label: string;
  placeholder?: string;
};

export function AmountInput({ label, placeholder = "0.00 APT" }: AmountInputProps) {
  return (
    <label className="amount_input">
      <span>{label}</span>
      <input className="input_control" inputMode="decimal" placeholder={placeholder} />
    </label>
  );
}
