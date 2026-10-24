"use client";

import type { ReactNode, Ref } from "react";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown } from "lucide-react";
import styles from "./select.module.css";

export type SelectValue = string | number;

export type SelectOption = {
  value: SelectValue;
  label: ReactNode;
  disabled?: boolean;
};

type SelectProps = {
  ariaLabel: string;
  value: SelectValue;
  options: SelectOption[];
  onValueChange: (value: SelectValue) => void;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  popupRef?: Ref<HTMLDivElement>;
  popupSize?: "compact" | "scrollable";
  trigger?: ReactNode;
  id?: string;
  className?: string;
  variant?: "accent" | "field" | "display";
};

export function Select({
  ariaLabel,
  value,
  options,
  onValueChange,
  disabled = false,
  onOpenChange,
  popupRef,
  popupSize = "compact",
  trigger,
  id,
  className,
  variant = "accent",
}: SelectProps) {
  return (
    <Menu.Root onOpenChange={onOpenChange}>
      <Menu.Trigger id={id} aria-label={ariaLabel} className={[styles.trigger, styles[variant], className].filter(Boolean).join(" ")} disabled={disabled}>
        {trigger ?? options.find((option) => option.value === value)?.label}
        {variant !== "display" && <ChevronDown aria-hidden="true" size={13} strokeWidth={2} />}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6}>
          <Menu.Popup
            className={[styles.popup, popupSize === "scrollable" && styles.scrollable].filter(Boolean).join(" ")}
            ref={popupRef}
          >
            <Menu.RadioGroup value={value} onValueChange={(nextValue) => onValueChange(nextValue as SelectValue)}>
              {options.map((option) => (
                <Menu.RadioItem
                  className={styles.item}
                  closeOnClick
                  disabled={disabled || option.disabled}
                  key={option.value}
                  value={option.value}
                >
                  <Menu.RadioItemIndicator className={styles.indicator} keepMounted>
                    <Check aria-hidden="true" size={13} strokeWidth={2} />
                  </Menu.RadioItemIndicator>
                  <span>{option.label}</span>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
