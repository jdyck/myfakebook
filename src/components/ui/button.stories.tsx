import type { Story } from "@ladle/react";
import { Download, Plus } from "lucide-react";
import { Button } from "./button";
import { TextField } from "./text-field";

export const Smoke: Story = () => <Button>Save song</Button>;

export const WithIcon: Story = () => (
  <Button variant="primary" size="regular">
    <Plus size={14} aria-hidden="true" />
    Add a song
  </Button>
);

export const Variants: Story = () => (
  <div className="flex flex-wrap items-center gap-3">
    {(["primary", "secondary", "quiet", "danger", "field"] as const).map((variant) => (
      <div className="flex flex-col gap-3" key={variant}>
        <Button variant={variant}>{variant}</Button>
        <Button variant={variant} size="regular">{variant} regular</Button>
        <Button variant={variant} size="regular">
          <Plus size={14} aria-hidden="true" />
          Add a song
        </Button>
        <Button variant={variant} disabled>{variant} disabled</Button>
      </div>
    ))}
    <Button size="icon" aria-label="Download song"><Download size={16} aria-hidden="true" /></Button>
    <Button size="icon" aria-label="Download unavailable" disabled><Download size={16} aria-hidden="true" /></Button>
  </div>
);

export const LongLabel: Story = () => <Button size="regular">Save a copy of this song to My Library</Button>;
LongLabel.meta = { previewLayout: "sidebar" };

export const BesideInput: Story = () => (
  <div className="flex max-w-md items-end gap-2">
    <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs text-muted">
      Song title
      <TextField size="large" defaultValue="The Session" />
    </label>
    <Button variant="field" size="icon" aria-label="Add Subtitle" title="Add Subtitle">
      <Plus size={18} aria-hidden="true" />
    </Button>
    <Button variant="field" size="icon" aria-label="Add Subtitle unavailable" disabled>
      <Plus size={18} aria-hidden="true" />
    </Button>
  </div>
);
