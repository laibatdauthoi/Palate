"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const menuId = useId();
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
  }, [options, value]);

  function selectOption(option: DropdownOption<T>) {
    onChange(option.value);
    setOpen(false);
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
        type="button"
      >
        <span>{selectedOption?.label ?? placeholder}</span>
        <span className="custom_dropdown_chevron" />
      </button>
      {open ? (
        <div aria-labelledby={buttonId} className="custom_dropdown_menu" id={menuId} role="listbox" tabIndex={-1}>
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
        </div>
      ) : null}
    </div>
  );
}
