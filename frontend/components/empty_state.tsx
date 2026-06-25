import { ActionButton } from "./action_button";

type EmptyStateProps = {
  title: string;
  copy: string;
  actionLabel?: string;
  actionHref?: string;
  variant?: "card" | "section";
  className?: string;
};

export function EmptyState({ title, copy, actionLabel, actionHref, variant = "card", className = "" }: EmptyStateProps) {
  const stateClassName = [
    "state_card",
    "empty_state",
    variant === "section" ? "full_width_state" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <div className={stateClassName}>
      <span className="state_mark">Empty</span>
      <h3>{title}</h3>
      <p>{copy}</p>
      {actionLabel && actionHref ? <ActionButton href={actionHref} variant="secondary">{actionLabel}</ActionButton> : null}
    </div>
  );
}
