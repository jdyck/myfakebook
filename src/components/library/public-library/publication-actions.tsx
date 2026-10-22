"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";

import { api } from "../../../../convex/_generated/api";
import { publicationLabel, publicationValueForSong, type LoadedSong, type PublicationValue } from "@/components/songs/types";
import { RadioMenu } from "@/components/ui/radio-menu";

export function AdminPublicationButton({
  enabled,
  song,
  onChanged,
  onStatus,
}: {
  enabled: boolean;
  song: LoadedSong | null;
  onChanged: (song: LoadedSong) => void;
  onStatus: (status: string) => void;
}) {
  if (!enabled || !song) return null;
  return <ConnectedAdminPublicationButton onChanged={onChanged} onStatus={onStatus} song={song} />;
}

function ConnectedAdminPublicationButton({
  song,
  onChanged,
  onStatus,
}: {
  song: LoadedSong;
  onChanged: (song: LoadedSong) => void;
  onStatus: (status: string) => void;
}) {
  const { user } = useUser();
  const setPublication = useMutation(api.songs.setPublication);
  const [changing, setChanging] = useState(false);
  const isAdmin = user?.publicMetadata?.role === "admin";
  const publication = publicationValueForSong(song);

  if (!isAdmin) return null;

  async function handleChange(nextPublication: PublicationValue) {
    if (nextPublication === publication) return;
    setChanging(true);
    onStatus(nextPublication === "none" ? "Unpublishing…" : "Publishing…");
    try {
      await setPublication({ id: song.id, publication: nextPublication });
      onChanged({
        ...song,
        publicationState: nextPublication === "none" ? "private" : "published",
        publicationTerritory: nextPublication === "none" ? undefined : nextPublication,
      });
      onStatus(nextPublication === "none" ? "Song is private" : `Published ${publicationLabel(nextPublication)}`);
    } catch {
      onStatus("Couldn’t update publication");
    } finally {
      setChanging(false);
    }
  }

  return (
    <RadioMenu
      ariaLabel={`Published: ${publicationLabel(publication)}`}
      disabled={changing}
      onValueChange={(value) => {
        if (typeof value === "string") void handleChange(value as PublicationValue);
      }}
      options={(["none", "US", "worldwide"] as const).map((value) => ({
        value,
        label: publicationLabel(value),
      }))}
      trigger={<>Published: {publicationLabel(publication)}</>}
      value={publication}
    />
  );
}

export function AdminPublicSongPublicationMenu({
  enabled,
  song,
  onStatus,
}: {
  enabled: boolean;
  song: LoadedSong | null;
  onStatus: (status: string) => void;
}) {
  const router = useRouter();
  if (!enabled || !song) return null;
  return (
    <ConnectedAdminPublicationButton
      onChanged={(changedSong) => router.push(`/mylibrary/${encodeURIComponent(changedSong.id)}`)}
      onStatus={onStatus}
      song={song}
    />
  );
}
