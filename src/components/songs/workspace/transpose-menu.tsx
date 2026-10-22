"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { RadioMenu } from "@/components/ui/radio-menu";
import { getTranspositionChoices } from "@/lib/abc-display";

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
    <RadioMenu
      ariaLabel={`${ariaLabel}: ${selectedChoice ? formatChoice(selectedChoice.steps, selectedChoice.key) : value}`}
      onOpenChange={setMenuOpen}
      onValueChange={(steps) => onChange(Number(steps))}
      options={choices.map(({ steps, key }) => ({ value: steps, label: formatChoice(steps, key) }))}
      popupRef={popupRef}
      popupSize="scrollable"
      trigger={(
        <>
          <ArrowRightLeft aria-hidden="true" size={13} strokeWidth={2} />
          Transpose
        </>
      )}
      value={value}
    />
  );
}
