export function LoadingState({
  label,
  copy = "Real on-chain data is loading."
}: {
  label: string;
  copy?: string;
}) {
  return (
    <div className="state_card loading_state" aria-live="polite" role="status">
      <div className="loading_spinner" aria-hidden="true">
        <span className="loading_spinner_ring" />
      </div>
      <h3>{label}</h3>
      <p>{copy}</p>
    </div>
  );
}
