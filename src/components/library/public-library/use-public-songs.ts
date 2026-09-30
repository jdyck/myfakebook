"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { PublicSong } from "@/lib/public-library";

type PublicSongsResponse = { songs: PublicSong[] };
type PublicSongQueryResult = {
  id: string;
  catalogId?: string;
  publicationTerritory?: "US" | "worldwide";
  title: string;
  writers: string;
  rhythm: string;
  abc: string;
};

function toPublicSong(song: PublicSongQueryResult): PublicSong {
  return {
    id: song.id,
    catalogId: "catalogId" in song ? song.catalogId : undefined,
    publicationTerritory: song.publicationTerritory,
    title: song.title,
    writers: song.writers,
    rhythm: song.rhythm,
    abc: song.abc,
  };
}

export function usePublicSongs() {
  const worldwideSongs = useQuery(api.songs.listPublicSongs);
  const [regionalSongs, setRegionalSongs] = useState<readonly PublicSong[] | null>(null);
  const [requestFinished, setRequestFinished] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSongs() {
      try {
        const response = await fetch("/api/public-songs", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load public songs");
        const result = await response.json() as PublicSongsResponse;
        if (!Array.isArray(result.songs)) throw new Error("Invalid public songs response");
        if (active) setRegionalSongs(result.songs);
      } catch {
        if (active) setRegionalSongs(null);
      } finally {
        if (active) setRequestFinished(true);
      }
    }

    void loadSongs();
    return () => {
      active = false;
    };
  }, []);

  const worldwidePublicSongs = worldwideSongs?.map(toPublicSong);
  const songs = regionalSongs === null
    ? worldwidePublicSongs
    : worldwidePublicSongs
      ? [
          ...worldwidePublicSongs,
          ...regionalSongs.filter((song) => song.publicationTerritory === "US"),
        ]
      : regionalSongs;
  const loading = regionalSongs === null && (!requestFinished || worldwideSongs === undefined);
  return { songs, loading };
}
