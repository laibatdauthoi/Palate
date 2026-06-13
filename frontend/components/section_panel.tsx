import type { ReactNode } from "react";

type SectionPanelProps = {
  title?: string;
  copy?: string;
  children: ReactNode;
  accent?: boolean;
  className?: string;
};

export function SectionPanel({ title, copy, children, accent = false, className = "" }: SectionPanelProps) {
  return (
    <section className={`section_panel ${accent ? "section_panel_accent" : ""} ${className}`.trim()}>
      {title || copy ? (
        <div className="section_panel_header">
          {title ? <h2>{title}</h2> : null}
          {copy ? <p>{copy}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
