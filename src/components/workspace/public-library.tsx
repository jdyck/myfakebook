"use client";

import type { PublicSong } from "@/lib/public-library";

type PublicLibraryProps = {
  songs: readonly PublicSong[];
  selectedSongId: string | null;
  onOpenSong: (song: PublicSong) => void;
};

export function PublicLibrary({ songs, selectedSongId, onOpenSong }: PublicLibraryProps) {
  return (
    <section
      aria-labelledby="public-library-heading"
      className="mb-5 rounded-[11px] border border-(--line) bg-(--paper) px-4 py-3.5"
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <div>
          <h2 id="public-library-heading" className="m-0 text-[12px] font-[720] text-foreground">
            Public Library
          </h2>
          <p className="m-0 mt-1 text-[10px] text-(--muted-soft)">
            Public songs available to everyone.
          </p>
        </div>
        <span className="font-mono text-[9px] text-(--muted-soft)">
          {songs.length} song{songs.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid gap-1.5">
        {songs.map((song) => {
          const isSelected = selectedSongId === song.id;
          return (
            <button
              aria-pressed={isSelected}
              className={`flex w-full items-center justify-between gap-3 rounded-[8px] border px-3 py-2 text-left transition-[border-color,background-color] duration-160 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) ${
                isSelected
                  ? "border-(--accent) bg-(--accent-soft)"
                  : "border-(--line) bg-(--paper-soft) hover:border-(--line-strong)"
              }`}
              key={song.id}
              type="button"
              onClick={() => onOpenSong(song)}
            >
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-[680] text-foreground">{song.title}</span>
                <span className="mt-0.5 block truncate text-[10px] text-(--muted-soft)">
                  {song.writers} · {song.rhythm}
                </span>
              </span>
              <span className="shrink-0 text-[10px] font-[650] text-(--accent-deep)">
                {isSelected ? "Open" : "View"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
