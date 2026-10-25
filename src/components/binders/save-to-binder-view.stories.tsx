import type { Story } from "@ladle/react";
import { useState } from "react";
import { SaveToBinderView } from "./save-to-binder-view";
import { binderSummaries } from "./binders.fixtures";
import { privateSong } from "@/components/story-support/song-samples";

function SaveExample({ mode = "populated" }: { mode?: "populated" | "empty" | "loading" | "error" | "saving" }) {
  const [binders, setBinders] = useState(binderSummaries);
  const [status, setStatus] = useState("Open Add to Binder to choose a destination.");
  return <div>
    <SaveToBinderView song={privateSong} binders={mode === "loading" ? undefined : mode === "empty" ? [] : binders}
      onStatus={setStatus} addSong={async ({ binderId, songId }) => {
        if (mode === "error") throw new Error("Couldn’t add song. Please try again.");
        if (mode === "saving") await new Promise(() => {});
        setBinders((current) => current.map((binder) => binder._id === binderId ? { ...binder, itemCount: binder.itemCount + 1, songIds: [...binder.songIds, songId] } : binder));
      }} />
    <p role="status" className="mt-4 text-xs text-muted">{status}</p>
  </div>;
}
export const Populated: Story = () => <SaveExample />;
export const Empty: Story = () => <SaveExample mode="empty" />;
export const Loading: Story = () => <SaveExample mode="loading" />;
export const SaveError: Story = () => <SaveExample mode="error" />;
export const Saving: Story = () => <SaveExample mode="saving" />;
