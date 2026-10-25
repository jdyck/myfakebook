import type { Story } from "@ladle/react";
import { useState } from "react";
import { PreviewPanel } from "./preview-panel";
import { WorkspaceToolbar } from "../workspace/workspace-toolbar";
import { DisplayControls } from "../workspace/display-controls";
import { DEFAULT_DISPLAY_SETTINGS } from "@/lib/notation/abc-display";
import { privateSong, publishedSong } from "@/components/story-support/song-samples";

function PreviewExample({ abc = publishedSong.abc, exporting = false }: { abc?: string; exporting?: boolean }) {
  const [settings, setSettings] = useState(DEFAULT_DISPLAY_SETTINGS);
  const [status, setStatus] = useState("Choose an export format to preview the action.");
  return <div className="p-4">
    <PreviewPanel abc={abc} displaySettings={settings}
      workspaceToolbar={<WorkspaceToolbar exporting={exporting} onEdit={() => setStatus("Edit song selected")}
        onExport={() => setStatus("MusicXML selected")} onExportAbc={() => setStatus("ABC selected")}
        onExportSvg={() => setStatus("SVG selected")} onExportPng={() => setStatus("PNG selected")} onExportPdf={() => setStatus("PDF selected")} />}
      displayControls={<DisplayControls abc={abc} settings={settings} onChange={(patch) => setSettings((current) => ({ ...current, ...patch }))} />}
    />
    <p role="status" className="mt-4 text-xs text-muted">{status}</p>
  </div>;
}
export const FullScore: Story = () => <PreviewExample />;
export const ShortScore: Story = () => <PreviewExample abc={privateSong.abc} />;
export const Exporting: Story = () => <PreviewExample exporting />;
export const Empty: Story = () => <PreviewExample abc="" />;
export const Narrow: Story = () => <PreviewExample />;
Narrow.meta = { previewLayout: "sidebar" };
const config = { meta: { previewLayout: "fullscreen" } };
export default config;
