import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "caution";
  children: ReactNode;
};

export function ActionButton({
  href,
  variant = "primary",
  children,
  className = "",
  ...props
}: ActionButtonProps) {
  const buttonClass = `action_button app_action_button action_button_${variant} app_action_${variant} ${className}`.trim();

  if (href) {
    return (
      <Link className={buttonClass} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={buttonClass} {...props}>
      {children}
    </button>
  );
}
