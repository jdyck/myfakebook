"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { SaveToBinderView } from "./save-to-binder-view";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { BinderSong } from "@/lib/songs/types";
import { type SongDisplaySettings } from "@/lib/notation/abc-display";
import componentStyles from "@/components/shared/song-actions.module.css";

export function SaveToBinderButton({
  enabled,
  song,
  onStatus,
}: {
  enabled: boolean;
  song: BinderSong | null;
  onStatus: (status: string) => void;
}) {
  if (!enabled || !song) return null;
  return <ConnectedSaveToBinderButton onStatus={onStatus} song={song} />;
}

function ConnectedSaveToBinderButton({
  song,
  onStatus,
}: {
  song: BinderSong;
  onStatus: (status: string) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const binders = useQuery(api.binders.listMine, isAuthenticated ? {} : "skip");
  const addSong = useMutation(api.binders.addSong);
  if (!isAuthenticated) return null;
  return <SaveToBinderView song={song} binders={binders} addSong={addSong} onStatus={onStatus} />;
}

export function SaveBinderDisplaySettingsButton({
  binderId,
  itemId,
  displaySettings,
  onStatus,
}: {
  binderId: Id<"binders">;
  itemId: Id<"binderItems">;
  displaySettings: SongDisplaySettings;
  onStatus: (status: string) => void;
}) {
  return <ConnectedSaveBinderDisplaySettingsButton displaySettings={displaySettings} itemId={itemId} onStatus={onStatus} binderId={binderId} />;
}

function ConnectedSaveBinderDisplaySettingsButton({
  binderId,
  itemId,
  displaySettings,
  onStatus,
}: {
  binderId: Id<"binders">;
  itemId: Id<"binderItems">;
  displaySettings: SongDisplaySettings;
  onStatus: (status: string) => void;
}) {
  const updateDisplaySettings = useMutation(api.binders.updateDisplaySettings);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateDisplaySettings({ binderId: binderId, itemId, displaySettings });
      onStatus("Binder settings saved");
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "Couldn’t save binder settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      className={componentStyles.saveBinderSettingsButton}
      disabled={saving}
      onClick={() => void handleSave()}
      type="button"
    >
      {saving ? "Saving…" : "Save settings"}
    </button>
  );
}
