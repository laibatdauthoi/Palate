export function ErrorState({
  title,
  copy,
  variant = "card",
  className = ""
}: {
  title: string;
  copy: string;
  variant?: "card" | "section";
  className?: string;
}) {
  const stateClassName = [
    "state_card",
    "error_state",
    variant === "section" ? "full_width_state" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <div className={stateClassName} role="alert">
      <span className="state_mark">Error</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}
