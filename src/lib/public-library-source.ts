import type { PublicSong } from "./public-library";

export function selectPublicLibrary(
  databaseSongs: readonly PublicSong[],
  fallbackSongs: readonly PublicSong[],
): readonly PublicSong[] {
  return databaseSongs.length > 0 ? databaseSongs : fallbackSongs;
}
