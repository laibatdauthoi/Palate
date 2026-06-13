import { ActionButton } from "./action_button";

type EmptyStateProps = {
  title: string;
  copy: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ title, copy, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="state_card empty_state">
      <span className="state_mark">Empty</span>
      <h3>{title}</h3>
      <p>{copy}</p>
      {actionLabel && actionHref ? <ActionButton href={actionHref} variant="secondary">{actionLabel}</ActionButton> : null}
    </div>
  );
}
