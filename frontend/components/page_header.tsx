import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  copy?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, copy, actions, className = "" }: PageHeaderProps) {
  return (
    <header className={`page_header ${className}`.trim()}>
      <div className="stack_sm page_header_content">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="page_header_title">{title}</h1>
        {copy ? <p className="page_header_copy">{copy}</p> : null}
      </div>
      {actions ? <div className="page_header_actions">{actions}</div> : null}
    </header>
  );
}
