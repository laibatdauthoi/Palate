import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "caution";
  size?: "sm" | "md" | "lg" | "cardMain";
  ariaLabel?: string;
  children: ReactNode;
};

export function ActionButton({
  href,
  variant = "primary",
  size = "md",
  children,
  ariaLabel,
  className = "",
  ...props
}: ActionButtonProps) {
  const textLabel = getActionButtonText(children);
  const accessibleLabel = ariaLabel ?? textLabel ?? undefined;
  const buttonClass = [
    "action_button",
    "app_action_button",
    `action_button_${variant}`,
    `app_action_${variant}`,
    `action_button_${size}`,
    className
  ].filter(Boolean).join(" ").trim();

  if (href) {
    return (
      <Link aria-label={accessibleLabel} className={buttonClass} href={href}>
        <span className="action_button_label">{children}</span>
      </Link>
    );
  }

  return (
    <button aria-label={accessibleLabel} className={buttonClass} {...props}>
      <span className="action_button_label">{children}</span>
    </button>
  );
}

function getActionButtonText(children: ReactNode): string | null {
  if (typeof children === "string") {
    return children.trim();
  }

  if (typeof children === "number") {
    return String(children);
  }

  return null;
}
