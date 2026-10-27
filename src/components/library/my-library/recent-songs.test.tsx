// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { resolveSongSource } from "@/lib/songs/song-source";
import type { LoadedSong } from "@/lib/songs/types";
import { RecentMyLibrarySongs } from "./recent-songs";

const { saveSong, query } = vi.hoisted(() => ({ saveSong: vi.fn(), query: vi.fn() }));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useMutation: () => saveSong,
  useQuery: () => query(),
  Authenticated: ({ children }: { children: React.ReactNode }) => children,
  Unauthenticated: () => null,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

it("does not save an opened song, but still saves edits and new songs", async () => {
  vi.useFakeTimers();
  const song: LoadedSong = {
    id: "song_1" as LoadedSong["id"],
    title: "Test song",
    abc: "X:1\nT:Test song\nM:4/4\nL:1/8\nK:C\nCDEF GABc|",
    publicationState: "private",
  };
  query.mockReturnValue([{ ...song, _id: song.id, updatedAt: 1 }]);
  saveSong.mockResolvedValue(song.id);
  const onStatus = vi.fn();
  const props = {
    enabled: true, hasSongEdits: false, title: song.title, ...resolveSongSource(song),
    isPublicSong: false, currentSong: song, recentSongIds: [],
    onNew: vi.fn(), onFileImport: vi.fn(), onCurrentSongChange: vi.fn(),
    onMySongsChange: vi.fn(), onStatus, onLoad: vi.fn(),
  };
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<RecentMyLibrarySongs {...props} />));
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(onStatus).not.toHaveBeenCalledWith("Saving…");
    expect(saveSong).not.toHaveBeenCalled();

    // Loading/normalizing notation must not trigger a save or a success message.
    await act(async () => root.render(<RecentMyLibrarySongs {...props} abc={`${props.abc}\n`} />));
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(saveSong).not.toHaveBeenCalled();
    expect(onStatus).not.toHaveBeenCalledWith("Saved to My Library");

    await act(async () => root.render(<RecentMyLibrarySongs {...props} hasSongEdits title="Edited title" />));
    expect(onStatus).toHaveBeenCalledWith("Saving…");
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(saveSong).toHaveBeenCalledWith(expect.objectContaining({ id: song.id, title: "Edited title" }));

    saveSong.mockClear();
    await act(async () => root.render(<RecentMyLibrarySongs {...props} hasSongEdits currentSong={null} title="New song" />));
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(saveSong).toHaveBeenCalledWith(expect.objectContaining({ id: undefined, title: "New song" }));
  } finally {
    await act(async () => root.unmount());
  }
});
