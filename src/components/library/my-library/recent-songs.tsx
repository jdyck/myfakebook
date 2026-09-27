"use client";

import { useEffect, useRef } from "react";
import { Authenticated, Unauthenticated, useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../../convex/_generated/api";
import type { LoadedSong, SongId } from "@/components/songs/types";
import componentStyles from "@/components/shared/song-actions.module.css";

type RecentMyLibrarySongsProps = {
  title: string;
  abc: string;
  isPublicSong: boolean;
  currentSong: LoadedSong | null;
  recentSongIds: readonly string[];
  onCurrentSongChange: (song: LoadedSong | null) => void;
  onMySongsChange: (songs: LoadedSong[]) => void;
  onStatus: (status: string) => void;
  onLoad: (song: LoadedSong) => void;
};

export function RecentMyLibrarySongs({
  enabled,
  ...props
}: RecentMyLibrarySongsProps & { enabled: boolean }) {
  if (!enabled) return null;
  return <ConnectedRecentMyLibrarySongs {...props} />;
}

function ConnectedRecentMyLibrarySongs({
  title,
  abc,
  isPublicSong,
  currentSong,
  recentSongIds,
  onCurrentSongChange,
  onMySongsChange,
  onStatus,
  onLoad,
}: RecentMyLibrarySongsProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const saveSong = useMutation(api.songs.save);
  const songs = useQuery(api.songs.listMySongs, isAuthenticated ? {} : "skip");
  const songId = useRef<SongId | undefined>(undefined);
  const mySongsRef = useRef<LoadedSong[]>([]);
  const songsRef = useRef(songs);
  const currentSongRef = useRef(currentSong);
  const statusRef = useRef(onStatus);
  const persistenceReady = isAuthenticated && songs !== undefined;
  const recentSongs = recentSongIds
    .slice()
    .reverse()
    .flatMap((songId) => {
      const song = songs?.find((candidate) => candidate._id === songId);
      return song ? [song] : [];
    })
    .slice(0, 5);

  useEffect(() => {
    statusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    if (!songs) return;
    const nextSongs = songs.map((song) => ({
      id: song._id,
      title: song.title,
      abc: song.abc,
      publicationState: song.publicationState,
    }));
    const songsChanged =
      nextSongs.length !== mySongsRef.current.length ||
      nextSongs.some((song, index) => {
        const previous = mySongsRef.current[index];
        return !previous || previous.id !== song.id || previous.title !== song.title || previous.abc !== song.abc || previous.publicationState !== song.publicationState;
      });
    if (!songsChanged) return;
    mySongsRef.current = nextSongs;
    onMySongsChange(nextSongs);
  }, [onMySongsChange, songs]);

  useEffect(() => {
    if (!persistenceReady || isPublicSong) return;

    if (!songId.current) {
      const existingSong = songs.find((song) => song.title === title && song.abc === abc);
      songId.current = existingSong?._id;
      if (existingSong) {
        onCurrentSongChange({ id: existingSong._id, title: existingSong.title, abc: existingSong.abc, publicationState: existingSong.publicationState });
      }
    }
  }, [abc, isPublicSong, onCurrentSongChange, persistenceReady, songs, title]);

  useEffect(() => {
    if (!isPublicSong) return;
    songId.current = undefined;
    onCurrentSongChange(null);
  }, [isPublicSong, onCurrentSongChange]);

  useEffect(() => {
    if (isPublicSong) return;
    songId.current = currentSong?.id;
  }, [currentSong?.id, isPublicSong]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !persistenceReady ||
      isPublicSong ||
      !abc.trim()
    ) {
      return;
    }
    let active = true;
    statusRef.current("Saving…");
    const timeout = window.setTimeout(async () => {
      try {
        const savedId = await saveSong({
          id: songId.current,
          title,
          abc,
        });
        if (!active) return;
        songId.current = savedId;
        const existingSong = songsRef.current?.find((song) => song._id === savedId);
        onCurrentSongChange({ id: savedId, title, abc, publicationState: currentSongRef.current?.publicationState ?? existingSong?.publicationState ?? "private" });
        statusRef.current("Saved to My Library");
      } catch {
        if (active) statusRef.current("Couldn’t sync");
      }
    }, 850);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [abc, isAuthenticated, isPublicSong, onCurrentSongChange, persistenceReady, saveSong, title]);

  useEffect(() => {
    if (!isAuthenticated) {
      songId.current = undefined;
      onCurrentSongChange(null);
    }
  }, [isAuthenticated, onCurrentSongChange]);

  useEffect(() => {
    if (isLoading) statusRef.current("Connecting…");
    if (!isLoading && (!isAuthenticated || isPublicSong)) statusRef.current("Not saved");
  }, [isAuthenticated, isLoading, isPublicSong]);

  return (
    <section className={componentStyles.recentSongsSection} aria-labelledby="recent-songs-heading">
      <h2 className={componentStyles.sectionHeading} id="recent-songs-heading">
        Recently viewed songs
      </h2>
      <Authenticated>
        {songs === undefined ? (
          <p className={componentStyles.recentSongsMessage} role="status">
            Loading your songs…
          </p>
        ) : recentSongs.length ? (
          <div className={componentStyles.recentSongList} aria-label="Recently viewed songs">
            {recentSongs.map((song) => (
              <div className={componentStyles.recentSongItem} key={song._id}>
                <Link
                  aria-current={currentSong?.id === song._id ? "page" : undefined}
                  className={componentStyles.recentSongLink}
                  href={`/mylibrary/${encodeURIComponent(song._id)}`}
                  onClick={() => {
                    const loadedSong = { id: song._id, title: song.title, abc: song.abc, publicationState: song.publicationState };
                    songId.current = song._id;
                    onCurrentSongChange(loadedSong);
                    onLoad(loadedSong);
                    statusRef.current("Loaded from My Library");
                  }}
                >

                  <span className={componentStyles.songDetails}>
                    <span className={componentStyles.songTitle}>{song.title}</span>
                    <span className={componentStyles.songPublicationDetails}>
                      {song.publicationState === "published" ? "Published · " : "Private · "}
                      {new Date(song.updatedAt).toLocaleDateString()}
                    </span>
                  </span>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className={componentStyles.recentSongsMessage}>
            Songs you open will appear here.
          </div>
        )}
        <Link
          className={componentStyles.myLibraryLink}
          href="/mylibrary"
        >
          All my songs
        </Link>
      </Authenticated>
      <Unauthenticated>
        <div className={componentStyles.recentSongsMessage}>
          <Link
            className={componentStyles.signInLink}
            href="/sign-in"
          >
            Sign in
          </Link>{" "}
          to sync your songs across devices.
        </div>
      </Unauthenticated>
    </section>
  );
}
