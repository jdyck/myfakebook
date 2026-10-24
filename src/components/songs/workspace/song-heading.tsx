import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { getSongMetadata } from "@/lib/notation/song-metadata";
import { publicationStatusForSong, type LoadedSong } from "@/lib/songs/types";
import styles from "./song-heading.module.css";

type SongHeadingProps = {
  abc: string;
  title: string;
  transposition: number;
  song: Pick<LoadedSong, "publicationState" | "publicationTerritory"> | null;
  isPublicSong: boolean;
  position?: number;
};

export function SongHeading({ abc, title, transposition, song, isPublicSong, position }: SongHeadingProps) {
  const metadata = getSongMetadata(abc, transposition);
  const punctuation = title.match(/[.!?]$/)?.[0] ?? ".";
  const displayTitle = /[.!?]$/.test(title) ? title.slice(0, -1) : title;
  return (
    <div className={styles.songHeading}>
      <div className="min-w-0">
        <Link className={styles.backLink} href={isPublicSong ? "/songs" : "/mylibrary"}>
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          {isPublicSong ? "SONGS" : "MY LIBRARY"} <span>/</span> SONG{position ? ` ${String(position).padStart(2, "0")}` : ""}
        </Link>
        <h1>{displayTitle}<span>{punctuation}</span></h1>
        {metadata.writers && <p className={styles.writers}>{metadata.writers}</p>}
      </div>
      <div className={styles.catalog}>
        <p>{song ? publicationStatusForSong(song).replace(" · ", " / ").toUpperCase() : "UNSAVED SONG"}</p>
        <p>{metadata.rhythm && <>{metadata.rhythm.toUpperCase()} <span>/</span> </>}{metadata.meter} <span>/</span> {metadata.keyLabel.toUpperCase()}</p>
      </div>
    </div>
  );
}
