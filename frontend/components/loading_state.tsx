export function LoadingState({
  label,
  copy = "Real on-chain data is loading.",
  variant = "card",
  className = ""
}: {
  label: string;
  copy?: string;
  variant?: "card" | "section";
  className?: string;
}) {
  const stateClassName = [
    "state_card",
    "loading_state",
    variant === "section" ? "full_width_state" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <div className={stateClassName} aria-live="polite" role="status">
      <div className="loading_spinner" aria-hidden="true">
        <span className="loading_spinner_ring" />
      </div>
      <h3>{label}</h3>
      <p>{copy}</p>
    </div>
  );
}
