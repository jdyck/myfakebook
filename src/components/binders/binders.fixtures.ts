import type { ComponentProps } from "react";
import type { BinderDetailViewProps } from "./binder-detail-view";
import type { SaveToBinderView } from "./save-to-binder-view";
import { privateSong, publishedSong, longTitleSong } from "@/components/story-support/song-samples";
import { DEFAULT_DISPLAY_SETTINGS } from "@/lib/notation/abc-display";
import type { Id } from "../../../convex/_generated/dataModel";

const updatedAt = Date.UTC(2026, 9, 20, 12);
const binderId = "viewer-binder" as Id<"binders">;
const songs = [privateSong, publishedSong, longTitleSong];
export const binderFixtures = {
  populated: {
    _id: binderId, _creationTime: updatedAt, ownerId: "viewer", name: "Friday at the Blue Note", updatedAt,
    items: songs.map((song, index) => ({
      _id: `viewer-item-${index}` as Id<"binderItems">, songId: song.id, title: song.title, legacySetListItemId: undefined,
      canOpen: true, isOwned: index !== 1, abc: song.abc, abcParts: null, content: null,
      position: index, displaySettings: DEFAULT_DISPLAY_SETTINGS,
    })),
  },
  availableSongs: songs.map((song, index) => ({ songId: song.id, title: song.title, isPublic: index !== 0 })),
} satisfies { populated: NonNullable<BinderDetailViewProps["binder"]>; availableSongs: BinderDetailViewProps["availableSongs"] };

export const binderSummaries = [
  { _id: binderId, _creationTime: updatedAt, ownerId: "viewer", name: "Friday at the Blue Note", itemCount: 3, updatedAt, songIds: [privateSong.id] },
  { _id: "viewer-empty-binder" as Id<"binders">, _creationTime: updatedAt, ownerId: "viewer", name: "A late set for the long journey home across the mountains", itemCount: 0, updatedAt: updatedAt - 86400000, songIds: [] },
] satisfies NonNullable<ComponentProps<typeof SaveToBinderView>["binders"]>;
