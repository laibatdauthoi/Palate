import type { ReactNode } from "react";

export type FilterTabItem<T extends string = string> = {
  key: T;
  label: string;
  count?: number;
  attention?: boolean;
  disabled?: boolean;
};

type FilterBarProps<T extends string = string> = {
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
  innerClassName?: string;
  items?: readonly FilterTabItem<T>[];
  activeKey?: T;
  onChange?: (key: T) => void;
  tablist?: boolean;
  tabsClassName?: string;
  getItemClassName?: (item: FilterTabItem<T>) => string | undefined;
};

type FilterTabsProps<T extends string = string> = {
  activeKey: T;
  ariaLabel?: string;
  className?: string;
  items: readonly FilterTabItem<T>[];
  onChange: (key: T) => void;
  tablist?: boolean;
  getItemClassName?: (item: FilterTabItem<T>) => string | undefined;
};

export function FilterBar<T extends string>({
  ariaLabel,
  children,
  className = "",
  innerClassName = "",
  items,
  activeKey,
  onChange,
  tablist = false,
  tabsClassName = "",
  getItemClassName
}: FilterBarProps<T>) {
  return (
    <div aria-label={ariaLabel} className={`filter_bar filter_bar_surface ${className}`.trim()}>
      <div className={`filter_bar_inner ${innerClassName}`.trim()}>
        {items && activeKey !== undefined && onChange ? (
          <FilterTabs
            activeKey={activeKey}
            ariaLabel={ariaLabel}
            className={tabsClassName}
            getItemClassName={getItemClassName}
            items={items}
            onChange={onChange}
            tablist={tablist}
          />
        ) : null}
        {children}
      </div>
    </div>
  );
}

function FilterTabs<T extends string>({
  activeKey,
  ariaLabel,
  className = "",
  items,
  onChange,
  tablist = false,
  getItemClassName
}: FilterTabsProps<T>) {
  const listRole = tablist ? "tablist" : undefined;
  const itemRole = tablist ? "tab" : undefined;

  return (
    <div aria-label={ariaLabel} className={`tabs ${className}`.trim()} role={listRole}>
      {items.map((item) => {
        const itemClassName = getItemClassName?.(item);
        return (
          <button
            aria-selected={tablist ? activeKey === item.key : undefined}
            className={`tab_button ${activeKey === item.key ? "active" : ""} ${item.attention ? "tab_button_attention" : ""} ${itemClassName ?? ""}`.trim()}
            disabled={item.disabled}
            key={item.key}
            onClick={() => onChange(item.key)}
            role={itemRole}
            type="button"
          >
            <span>{item.label}</span>
            {typeof item.count === "number" ? <span className="tab_badge">{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
