"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { ArrowRightLeft, Check, ChevronDown } from "lucide-react";
import { getTranspositionChoices } from "@/lib/abc-display";
import componentStyles from "./transpose-menu.module.css";

type TransposeMenuProps = {
  abc: string;
  ariaLabel: string;
  value: number;
  onChange: (steps: number) => void;
};

function formatChoice(steps: number, key: string) {
  return `${steps > 0 ? `+${steps}` : steps} (${key})`;
}

export function TransposeMenu({ abc, ariaLabel, value, onChange }: TransposeMenuProps) {
  const choices = useMemo(() => getTranspositionChoices(abc), [abc]);
  const selectedChoice = choices.find((choice) => choice.steps === value);
  const popupRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useLayoutEffect(() => {
    if (!menuOpen) return;

    const popup = popupRef.current;
    const selectedItem = popup?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]');
    if (!popup || !selectedItem) return;

    const popupBounds = popup.getBoundingClientRect();
    const itemBounds = selectedItem.getBoundingClientRect();
    const itemCenter = itemBounds.top - popupBounds.top + itemBounds.height / 2;
    popup.scrollTop += itemCenter - popup.clientHeight / 2;
  }, [menuOpen, value]);

  return (
    <Menu.Root onOpenChange={(open) => setMenuOpen(open)}>
      <Menu.Trigger
        aria-label={`${ariaLabel}: ${selectedChoice ? formatChoice(selectedChoice.steps, selectedChoice.key) : value}`}
        className={componentStyles.trigger}
      >
        <ArrowRightLeft aria-hidden="true" size={13} strokeWidth={2} />
        Transpose
        <ChevronDown aria-hidden="true" size={13} strokeWidth={2} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6}>
          <Menu.Popup className={componentStyles.popup} ref={popupRef}>
            <Menu.RadioGroup
              value={value}
              onValueChange={(steps) => onChange(Number(steps))}
            >
              {choices.map(({ steps, key }) => (
                <Menu.RadioItem
                  className={componentStyles.item}
                  closeOnClick
                  key={steps}
                  value={steps}
                >
                  <Menu.RadioItemIndicator className={componentStyles.indicator} keepMounted>
                    <Check aria-hidden="true" size={13} strokeWidth={2} />
                  </Menu.RadioItemIndicator>
                  <span>{formatChoice(steps, key)}</span>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
