"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

export type DropdownOption<T extends string> = {
  label: string;
  value: T;
  description?: string;
};

type CustomDropdownProps<T extends string> = {
  label: string;
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
};

export function CustomDropdown<T extends string>({ label, options, value, onChange, placeholder = "Select" }: CustomDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.findIndex((option) => option.value === value)));
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const buttonId = useId();
  const menuId = useId();
  const selectedOption = options.find((option) => option.value === value);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;
    const menuHeight = Math.min(320, Math.round(window.innerHeight * 0.52));
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openUp = spaceBelow < Math.min(menuHeight, 220) && spaceAbove > spaceBelow;
    const availableHeight = Math.max(160, openUp ? spaceAbove - gap : spaceBelow - gap);
    const maxHeight = Math.min(menuHeight, availableHeight);
    const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
    const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
    const top = openUp ? Math.max(viewportPadding, rect.top - maxHeight - gap) : Math.min(rect.bottom + gap, window.innerHeight - viewportPadding - maxHeight);

    setMenuStyle({
      left,
      maxHeight,
      minWidth: rect.width,
      top,
      width,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!dropdownRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
  }, [options, value]);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, updateMenuPosition]);

  function selectOption(option: DropdownOption<T>) {
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(options.length - 1, index + 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open && options[activeIndex]) {
        selectOption(options[activeIndex]);
      } else {
        setOpen(true);
      }
    }
  }

  return (
    <div className="custom_dropdown" ref={dropdownRef}>
      <span className="custom_dropdown_label">{label}</span>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        className={`custom_dropdown_button ${open ? "open" : ""}`}
        id={buttonId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        ref={buttonRef}
        type="button"
      >
        <span>{selectedOption?.label ?? placeholder}</span>
        <span className="custom_dropdown_chevron" />
      </button>
      {open && mounted ? createPortal(
        <div aria-labelledby={buttonId} className="custom_dropdown_menu" id={menuId} ref={menuRef} role="listbox" style={menuStyle} tabIndex={-1}>
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;

            return (
              <button
                aria-selected={selected}
                className={`custom_dropdown_item ${selected ? "selected" : ""} ${active ? "active" : ""}`}
                key={option.value}
                onClick={() => selectOption(option)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                {option.description ? <small>{option.description}</small> : null}
              </button>
            );
          })}
        </div>,
        document.body
      ) : null}
    </div>
  );
}
