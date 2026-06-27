import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  copy?: string;
  actions?: ReactNode;
  variant?: "default" | "floating";
  density?: "default" | "compact";
  stacked?: boolean;
  lifted?: boolean;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  copy,
  actions,
  variant = "default",
  density = "default",
  stacked = false,
  lifted = false,
  className = ""
}: PageHeaderProps) {
  const headerClassName = [
    "page_header",
    stacked ? "page_header_stacked" : "",
    variant === "floating" ? "page_header_floating" : "",
    density === "compact" ? "page_header_density_compact" : "",
    lifted ? "page_header_lifted" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <header className={headerClassName}>
      <div className="stack_sm page_header_content">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="page_header_title">{title}</h1>
        {copy ? <p className="page_header_copy">{copy}</p> : null}
      </div>
      {actions ? <div className="page_header_actions">{actions}</div> : null}
    </header>
  );
}
