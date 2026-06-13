export function CountdownTimer({ value }: { value: string }) {
  return (
    <span className="countdown_timer" aria-label={`Time remaining ${value}`}>
      {value}
    </span>
  );
}
