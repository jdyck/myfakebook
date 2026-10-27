"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";

import { api } from "../../../../convex/_generated/api";
import { publicationLabel, publicationValueForSong, type LoadedSong, type PublicationValue } from "@/lib/songs/types";
import { PublicationSelect } from "./publication-select";

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
  const setPublicDomain = useMutation(api.songs.setPublicDomain);
  const [changing, setChanging] = useState(false);
  const isAdmin = user?.publicMetadata?.role === "admin";
  const publication = publicationValueForSong(song);

  if (!isAdmin) return null;

  async function handleChange(nextPublication: PublicationValue) {
    if (nextPublication === publication) return;
    setChanging(true);
    onStatus("Updating public-domain status…");
    try {
      await setPublicDomain({ id: song.id, territory: nextPublication });
      onChanged({
        ...song,
        publicDomainTerritory: nextPublication,
        publicationState: nextPublication === "none" ? "private" : "published",
        publicationTerritory: nextPublication === "none" ? undefined : nextPublication,
      });
      onStatus(nextPublication === "none" ? "Song is private" : `Public domain · ${publicationLabel(nextPublication)}`);
    } catch {
      onStatus("Couldn’t update public-domain status");
    } finally {
      setChanging(false);
    }
  }

  return (
    <PublicationSelect publication={publication} changing={changing} onChange={(value) => void handleChange(value)} />
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
