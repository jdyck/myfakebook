"use client";

import {
  MyLibrarySongs,
  type LoadedSong,
} from "@/components/workspace/song-persistence";

type PrivateLibrarySidebarProps = {
  enabled: boolean;
  abc: string;
  title: string;
  isPublicSong: boolean;
  currentSong: LoadedSong | null;
  onCurrentSongChange: (song: LoadedSong | null) => void;
  onMySongsChange: (songs: LoadedSong[]) => void;
  onLoad: (song: LoadedSong) => void;
  onStatus: (status: string) => void;
};

export function PrivateLibrarySidebar({
  enabled,
  abc,
  title,
  isPublicSong,
  currentSong,
  onCurrentSongChange,
  onMySongsChange,
  onLoad,
  onStatus,
}: PrivateLibrarySidebarProps) {
  if (!enabled) return null;

  return (
    <aside
      className="min-w-0 border-r border-(--line) px-3.75 py-6.25 max-[720px]:hidden"
      aria-label="My Library"
    >
      <div className="grid gap-1 px-2">
        <span className="text-[13px] font-[680] text-foreground">My Library</span>
      </div>
      <MyLibrarySongs
        abc={abc}
        enabled={enabled}
        isPublicSong={isPublicSong}
        currentSong={currentSong}
        onCurrentSongChange={onCurrentSongChange}
        onMySongsChange={onMySongsChange}
        onLoad={onLoad}
        onStatus={onStatus}
        title={title}
      />
    </aside>
  );
}
