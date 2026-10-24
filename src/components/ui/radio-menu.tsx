"use client";

import type { ReactNode, Ref } from "react";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown } from "lucide-react";
import styles from "./radio-menu.module.css";

export type RadioMenuValue = string | number;

export type RadioMenuOption = {
  value: RadioMenuValue;
  label: ReactNode;
  disabled?: boolean;
};

type RadioMenuProps = {
  ariaLabel: string;
  value: RadioMenuValue;
  options: RadioMenuOption[];
  onValueChange: (value: RadioMenuValue) => void;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  popupRef?: Ref<HTMLDivElement>;
  popupSize?: "compact" | "scrollable";
  trigger: ReactNode;
};

export function RadioMenu({
  ariaLabel,
  value,
  options,
  onValueChange,
  disabled = false,
  onOpenChange,
  popupRef,
  popupSize = "compact",
  trigger,
}: RadioMenuProps) {
  return (
    <Menu.Root onOpenChange={onOpenChange}>
      <Menu.Trigger aria-label={ariaLabel} className={styles.trigger} disabled={disabled}>
        {trigger}
        <ChevronDown aria-hidden="true" size={13} strokeWidth={2} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6}>
          <Menu.Popup
            className={[styles.popup, popupSize === "scrollable" && styles.scrollable].filter(Boolean).join(" ")}
            ref={popupRef}
          >
            <Menu.RadioGroup value={value} onValueChange={(nextValue) => onValueChange(nextValue as RadioMenuValue)}>
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
