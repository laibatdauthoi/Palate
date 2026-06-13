export function LoadingState({ label }: { label: string }) {
  return (
    <div className="state_card loading_state" aria-live="polite">
      <div className="loading_bar">
        <span />
      </div>
      <h3>{label}</h3>
      <p>Mock transaction state for the UI shell.</p>
    </div>
  );
}
