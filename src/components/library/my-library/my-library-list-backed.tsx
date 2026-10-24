"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { Roboto_Condensed } from "next/font/google";

import { Header } from "@/components/app-shell/header/header";
import { api } from "../../../../convex/_generated/api";
import { MyLibraryList } from "./my-library-list";

const condensed = Roboto_Condensed({ subsets: ["latin"], display: "swap" });

export function MyLibraryListUnconfigured() {
  return <MyLibraryList songs={[]} header={<Header clerkConfigured activeSection="library" />} captionClassName={condensed.className} />;
}

export function MyLibraryListBacked() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const savedSongs = useQuery(api.songs.listMySongs, isAuthenticated ? {} : "skip");
  const songs = savedSongs?.map((song) => ({
    id: song._id,
    title: song.title,
    updatedAt: song.updatedAt,
    publicationState: song.publicationState,
    publicationTerritory: song.publicationTerritory,
  }));
  return <MyLibraryList header={<Header clerkConfigured activeSection="library" />} captionClassName={condensed.className} songs={songs} loading={isLoading || (isAuthenticated && !savedSongs)} />;
}

