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
      className={componentStyles.songLibrarySection}
    >
      <div className={componentStyles.sectionHeader}>
        <div>
          <h2 id="songs-heading" className={componentStyles.sectionTitle}>
            Songs
          </h2>
          <p className={componentStyles.sectionDescription}>
            Songs available in your region.
          </p>
        </div>
        <span className={componentStyles.songCount}>
          {songs.length} song{songs.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className={componentStyles.songList}>
        {songs.map((song) => {
          const isSelected = selectedSongId === song.id;
          return (
            <button
              aria-pressed={isSelected}
              className={`${componentStyles.songChoiceButton} ${
                isSelected
                  ? componentStyles.selectedSongButton
                  : componentStyles.unselectedSongButton
              }`}
              key={song.id}
              type="button"
              onClick={() => onOpenSong(song)}
            >
              <span className={componentStyles.songDetails}>
                <span className={componentStyles.songTitle}>{song.title}</span>
                <span className={componentStyles.songMetadata}>
                  {song.writers} · {song.rhythm}
                </span>
              </span>
              <span className={componentStyles.songActionLabel}>
                {isSelected ? "Open" : "View"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
