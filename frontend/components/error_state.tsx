export function ErrorState({ title, copy, className = "" }: { title: string; copy: string; className?: string }) {
  return (
    <div className={`state_card error_state ${className}`.trim()} role="alert">
      <span className="state_mark">Error</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}
