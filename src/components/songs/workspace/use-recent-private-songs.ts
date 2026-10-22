"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

const RECENT_PRIVATE_SONGS_STORAGE_KEY = "myfakebook:recent-private-song-ids";
const MAX_RECENT_PRIVATE_SONGS = 50;
const recentPrivateSongListeners = new Set<() => void>();
let recentPrivateSongSnapshot: string | null = null;

function getRecentPrivateSongSnapshot() {
  try {
    recentPrivateSongSnapshot = window.localStorage.getItem(RECENT_PRIVATE_SONGS_STORAGE_KEY) ?? "[]";
  } catch {
    recentPrivateSongSnapshot ??= "[]";
  }
  return recentPrivateSongSnapshot;
}

function subscribeToRecentPrivateSongs(listener: () => void) {
  recentPrivateSongListeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== RECENT_PRIVATE_SONGS_STORAGE_KEY) return;
    recentPrivateSongSnapshot = event.newValue ?? "[]";
    listener();
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    recentPrivateSongListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function parseRecentPrivateSongIds(snapshot: string) {
  try {
    const savedIds: unknown = JSON.parse(snapshot);
    return Array.isArray(savedIds)
      ? savedIds.filter((songId): songId is string => typeof songId === "string").slice(-MAX_RECENT_PRIVATE_SONGS)
      : [];
  } catch {
    return [];
  }
}

function mergeRecentPrivateSongIds(...histories: (readonly string[])[]) {
  return histories
    .flat()
    .reverse()
    .filter((songId, index, allSongIds) => allSongIds.indexOf(songId) === index)
    .reverse()
    .slice(-MAX_RECENT_PRIVATE_SONGS);
}

function writeRecentPrivateSongIds(songIds: readonly string[]) {
  const nextSnapshot = JSON.stringify(songIds.slice(-MAX_RECENT_PRIVATE_SONGS));
  recentPrivateSongSnapshot = nextSnapshot;
  try {
    window.localStorage.setItem(RECENT_PRIVATE_SONGS_STORAGE_KEY, nextSnapshot);
  } catch {
    // Recent song navigation should still work when browser storage is unavailable.
  }
  recentPrivateSongListeners.forEach((listener) => listener());
}

function recordRecentPrivateSong(songId: string) {
  const history = parseRecentPrivateSongIds(getRecentPrivateSongSnapshot());
  writeRecentPrivateSongIds(mergeRecentPrivateSongIds(history.filter((id) => id !== songId), [songId]));
}

function forgetRecentPrivateSong(songId: string) {
  const history = parseRecentPrivateSongIds(getRecentPrivateSongSnapshot());
  writeRecentPrivateSongIds(history.filter((id) => id !== songId));
}

export function useRecentPrivateSongs(initialSongId?: string) {
  const snapshot = useSyncExternalStore(
    subscribeToRecentPrivateSongs,
    getRecentPrivateSongSnapshot,
    () => "[]",
  );
  const songIds = useMemo(
    () => mergeRecentPrivateSongIds(
      parseRecentPrivateSongIds(snapshot),
      initialSongId ? [initialSongId] : [],
    ),
    [initialSongId, snapshot],
  );

  useEffect(() => {
    if (initialSongId) recordRecentPrivateSong(initialSongId);
  }, [initialSongId]);

  return {
    songIds,
    recordSong: recordRecentPrivateSong,
    forgetSong: forgetRecentPrivateSong,
  };
}
