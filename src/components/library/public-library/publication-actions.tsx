"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Menu } from "@base-ui/react/menu";
import { useMutation } from "convex/react";
import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

import { api } from "../../../../convex/_generated/api";
import { publicationLabel, publicationValueForSong, type LoadedSong, type PublicationValue } from "@/components/songs/types";
import menuStyles from "./publication-menu.module.css";

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
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Published: ${publicationLabel(publication)}`}
        className={menuStyles.trigger}
        disabled={changing}
      >
        Published
        <ChevronDown aria-hidden="true" size={13} strokeWidth={2} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6}>
          <Menu.Popup className={menuStyles.popup}>
            <Menu.RadioGroup
              value={publication}
              onValueChange={(value) => {
                if (typeof value === "string") void handleChange(value as PublicationValue);
              }}
            >
              {(["none", "US", "worldwide"] as const).map((value) => (
                <Menu.RadioItem
                  className={menuStyles.item}
                  closeOnClick
                  disabled={changing}
                  key={value}
                  value={value}
                >
                  <Menu.RadioItemIndicator className={menuStyles.indicator} keepMounted>
                    <Check aria-hidden="true" size={13} strokeWidth={2} />
                  </Menu.RadioItemIndicator>
                  <span>{publicationLabel(value)}</span>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
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
