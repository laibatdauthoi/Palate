import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  copy?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, copy, actions }: PageHeaderProps) {
  return (
    <header className="page_header">
      <div className="stack_sm">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {copy ? <p>{copy}</p> : null}
      </div>
      {actions ? <div className="page_header_actions">{actions}</div> : null}
    </header>
  );
}
