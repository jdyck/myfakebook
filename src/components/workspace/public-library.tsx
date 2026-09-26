"use client";

import type { PublicSong } from "@/lib/public-library";
import componentStyles from "./public-library.module.css";

type PublicLibraryProps = {
  songs: readonly PublicSong[];
  selectedSongId: string | null;
  onOpenSong: (song: PublicSong) => void;
};

export function PublicLibrary({ songs, selectedSongId, onOpenSong }: PublicLibraryProps) {
  return (
    <section
      aria-labelledby="songs-heading"
      className={componentStyles.style0}
    >
      <div className={componentStyles.style1}>
        <div>
          <h2 id="songs-heading" className={componentStyles.style2}>
            Songs
          </h2>
          <p className={componentStyles.style3}>
            Songs available to everyone.
          </p>
        </div>
        <span className={componentStyles.style4}>
          {songs.length} song{songs.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className={componentStyles.style5}>
        {songs.map((song) => {
          const isSelected = selectedSongId === song.id;
          return (
            <button
              aria-pressed={isSelected}
              className={`${componentStyles.style6} ${
                isSelected
                  ? componentStyles.style7
                  : componentStyles.style8
              }`}
              key={song.id}
              type="button"
              onClick={() => onOpenSong(song)}
            >
              <span className={componentStyles.style9}>
                <span className={componentStyles.style10}>{song.title}</span>
                <span className={componentStyles.style11}>
                  {song.writers} · {song.rhythm}
                </span>
              </span>
              <span className={componentStyles.style12}>
                {isSelected ? "Open" : "View"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
