export function LoadingState({ label }: { label: string }) {
  return (
    <div className="state_card loading_state" aria-live="polite">
      <div className="loading_bar">
        <span />
      </div>
      <h3>{label}</h3>
      <p>Transaction state appears here while an action is processing.</p>
    </div>
  );
}
