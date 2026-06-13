import type { ReactNode } from "react";
import { ActionButton } from "./action_button";

type ModalShellProps = {
  title: string;
  children: ReactNode;
  open: boolean;
  onClose: () => void;
};

export function ModalShell({ title, children, open, onClose }: ModalShellProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal_backdrop" role="presentation">
      <section className="modal_shell" role="dialog" aria-modal="true" aria-labelledby="modal_title">
        <div className="spread">
          <h2 id="modal_title">{title}</h2>
          <ActionButton variant="ghost" onClick={onClose}>Close</ActionButton>
        </div>
        {children}
      </section>
    </div>
  );
}
