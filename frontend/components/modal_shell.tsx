import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";
import { ActionButton } from "./action_button";

type ModalShellProps = {
  title: string;
  children: ReactNode;
  open: boolean;
  onClose: () => void;
};

export function ModalShell({ title, children, open, onClose }: ModalShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const modal = (
    <div className="modal_backdrop" onMouseDown={onClose} role="presentation">
      <section className="modal_shell" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal_title">
        <div className="modal_shell_header spread">
          <h2 id="modal_title">{title}</h2>
          <ActionButton variant="ghost" onClick={onClose}>Close</ActionButton>
        </div>
        <div className="modal_shell_body">{children}</div>
      </section>
    </div>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(modal, document.body);
}
