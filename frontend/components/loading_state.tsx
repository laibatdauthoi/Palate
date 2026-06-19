export function LoadingState({
  label,
  copy = "Real on-chain data is loading."
}: {
  label: string;
  copy?: string;
}) {
  return (
    <div className="state_card loading_state" aria-live="polite">
      <div className="loading_bar">
        <span />
      </div>
      <h3>{label}</h3>
      <p>{copy}</p>
    </div>
  );
}
