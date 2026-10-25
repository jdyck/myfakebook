import type { Story } from "@ladle/react";
import { useState } from "react";
import { DEFAULT_DISPLAY_SETTINGS, type SongDisplaySettings } from "@/lib/notation/abc-display";
import { DisplayControls } from "./display-controls";
import { SongHeading } from "./song-heading";
import { songHeadingFixtures } from "./song-heading.fixtures";

export const Interactive: Story = () => {
  const [settings, setSettings] = useState<SongDisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  return (
    <div className="flex flex-col gap-6">
      <DisplayControls abc={songHeadingFixtures.unsaved.abc} settings={settings} onChange={(patch) => setSettings((current) => ({ ...current, ...patch }))} />
      <output aria-label="Current display settings" className="whitespace-pre-wrap break-words font-mono text-xs">{JSON.stringify(settings, null, 2)}</output>
    </div>
  );
};
Interactive.meta = { previewLayout: "sidebar" };

export const WithHeading: Story = () => {
  const [settings, setSettings] = useState<SongDisplaySettings>({ ...DEFAULT_DISPLAY_SETTINGS, transposition: 2, showLyrics: false, showParts: false });
  return (
    <div className="flex flex-col gap-6">
      <SongHeading {...songHeadingFixtures.published} transposition={settings.transposition} />
      <div className="w-80 max-w-full">
        <DisplayControls abc={songHeadingFixtures.published.abc} settings={settings} onChange={(patch) => setSettings((current) => ({ ...current, ...patch }))} />
      </div>
    </div>
  );
};
