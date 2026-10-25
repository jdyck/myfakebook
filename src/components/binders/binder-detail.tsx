"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Header } from "@/components/app-shell/header/header";
import { BinderDetailView } from "./binder-detail-view";

type BinderDetailProps = { id: string };

export function BinderDetail({ id }: BinderDetailProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const requestedId = /^[a-zA-Z0-9_-]+$/.test(id) ? id : null;
  const binder = useQuery(api.binders.get, isAuthenticated && requestedId ? { id: requestedId } : "skip");
  const availableSongs = useQuery(api.binders.listAvailableSongs, isAuthenticated ? {} : "skip");
  const renameBinder = useMutation(api.binders.rename);
  const removeBinder = useMutation(api.binders.remove);
  const addSong = useMutation(api.binders.addSong);
  const updateDisplaySettings = useMutation(api.binders.updateDisplaySettings);
  const removeItem = useMutation(api.binders.removeItem);
  const reorder = useMutation(api.binders.reorder);
  return <BinderDetailView
    binder={binder} availableSongs={availableSongs}
    loading={isLoading || (isAuthenticated && ((requestedId !== null && binder === undefined) || availableSongs === undefined))}
    header={<Header clerkConfigured activeSection="binders" />}
    onDeleted={() => router.push("/binders")}
    renameBinder={renameBinder} removeBinder={removeBinder} addSong={addSong}
    updateDisplaySettings={updateDisplaySettings} removeItem={removeItem} reorder={reorder}
  />;
}
