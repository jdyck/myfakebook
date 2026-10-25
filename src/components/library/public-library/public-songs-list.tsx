"use client";

import { useUser } from "@clerk/nextjs";
import { Roboto_Condensed } from "next/font/google";
import { Header } from "@/components/app-shell/header/header";
import type { PublicSong } from "@/lib/songs/public-library";
import { usePublicSongs } from "./use-public-songs";
import { PublicSongsListView } from "./public-songs-list-view";

const condensed = Roboto_Condensed({ subsets: ["latin"], display: "swap" });

type PublicSongsListProps = {
  clerkConfigured: boolean;
  songs: readonly PublicSong[] | undefined;
  isAdmin?: boolean;
};

export function PublicSongsListBacked({ clerkConfigured }: {
  clerkConfigured: boolean;
}) {
  return clerkConfigured
    ? <AdminAwarePublicSongsList clerkConfigured={clerkConfigured} />
    : <ConnectedPublicSongsList clerkConfigured={clerkConfigured} isAdmin={false} />;
}

function AdminAwarePublicSongsList({ clerkConfigured }: { clerkConfigured: boolean }) {
  const { user } = useUser();
  return <ConnectedPublicSongsList clerkConfigured={clerkConfigured} isAdmin={user?.publicMetadata?.role === "admin"} />;
}

function ConnectedPublicSongsList({ clerkConfigured, isAdmin }: { clerkConfigured: boolean; isAdmin: boolean }) {
  const { songs, loading } = usePublicSongs({ isAdmin });
  return <PublicSongsList clerkConfigured={clerkConfigured} isAdmin={isAdmin} songs={loading ? undefined : songs} />;
}

export function PublicSongsList({ clerkConfigured, ...props }: PublicSongsListProps) {
  return <PublicSongsListView {...props} header={<Header clerkConfigured={clerkConfigured} activeSection="songs" />} captionClassName={condensed.className} />;
}
