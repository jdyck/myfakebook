import type { Story } from "@ladle/react";
import { useState } from "react";
import { Select, type SelectValue } from "./select";

const options = [
  { value: "private", label: "Private" },
  { value: "US", label: "Published in the United States" },
  { value: "worldwide", label: "Published worldwide", disabled: true },
];

export const Publication: Story = () => {
  const [value, setValue] = useState<SelectValue>("private");
  return (
    <div className="flex flex-col items-start gap-4">
      <Select ariaLabel="Publication territory" value={value} options={options} onValueChange={setValue} trigger="Publication" />
      <p role="status">Selected: {options.find((option) => option.value === value)?.label}</p>
      <Select ariaLabel="Publication unavailable" value="private" options={options} onValueChange={setValue} trigger="Unavailable" disabled />
    </div>
  );
};
Publication.meta = { previewLayout: "sidebar" };

export const Scrollable: Story = () => {
  const [value, setValue] = useState<SelectValue>(0);
  return (
    <div className="flex flex-col items-start gap-4">
      <Select ariaLabel="Transpose by semitones" value={value} onValueChange={setValue} popupSize="scrollable" trigger={`${Number(value) > 0 ? "+" : ""}${value} semitones`} options={Array.from({ length: 25 }, (_, index) => ({ value: index - 12, label: `${index - 12} semitones${index === 12 ? " (original key)" : ""}` }))} />
      <p role="status">Transposition: {value}</p>
    </div>
  );
};
Scrollable.meta = { previewLayout: "sidebar" };

export const Field: Story = () => {
  const [value, setValue] = useState<SelectValue>("melody");
  return <div className="w-44"><Select ariaLabel="Playback parts" variant="field" value={value} onValueChange={setValue} options={[{ value: "melody", label: "Melody" }, { value: "chords", label: "Chords" }, { value: "both", label: "Melody + chords" }]} /></div>;
};

export const Display: Story = () => {
  const [value, setValue] = useState<SelectValue>(0);
  return <div className="w-44"><Select ariaLabel="Concert key" variant="display" value={value} onValueChange={setValue} options={[{ value: 0, label: "C" }, { value: 2, label: "D" }, { value: -2, label: "B♭ (down)" }]} /></div>;
};
