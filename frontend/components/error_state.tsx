export function ErrorState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="state_card error_state" role="alert">
      <span className="state_mark">Error</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}
