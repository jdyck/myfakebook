"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { useUser } from "@clerk/nextjs";
import { PublicBinderPage } from "./public-binder";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Header } from "@/components/app-shell/header/header";
import { BinderDetailView } from "./binder-detail-view";

type BinderDetailProps = { id: string };

export function BinderDetail({ id }: BinderDetailProps) {
  const router = useRouter();
  const { user } = useUser();
  const setPublished = useMutation(api.binders.setPublished);
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
  const [regional, setRegional] = useState<{
    revision: string; binder: FunctionReturnType<typeof api.binders.get>;
    availableSongs: FunctionReturnType<typeof api.binders.listAvailableSongs>;
  }>();
  const revision = JSON.stringify([binder, availableSongs]);
  useEffect(() => {
    if (!isAuthenticated || !binder) return;
    let active = true;
    fetch(`/api/binder-owner?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (active) setRegional({ ...data, revision }); })
      .catch(() => { /* Reactive worldwide/owner view remains available. */ });
    return () => { active = false; };
  }, [id, revision, isAuthenticated, binder]);
  const regionalView = regional?.revision === revision ? regional : undefined;
  const addRegionalSong = async (args: FunctionArgs<typeof api.binders.addSong>): Promise<FunctionReturnType<typeof api.binders.addSong>> => {
    if (!regionalView) return addSong(args);
    const response = await fetch("/api/binder-owner", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Couldn’t add song");
    return data.itemId;
  };
  if (!isLoading && (binder === null || !isAuthenticated)) return <PublicBinderPage id={id} />;
  return <BinderDetailView
    canPublish={user?.publicMetadata?.role === "admin"}
    setPublished={setPublished}
    binder={regionalView?.binder ?? binder} availableSongs={regionalView?.availableSongs ?? availableSongs}
    loading={isLoading || (isAuthenticated && ((requestedId !== null && binder === undefined) || availableSongs === undefined))}
    header={<Header clerkConfigured activeSection="binders" />}
    onDeleted={() => router.push("/binders")}
    renameBinder={renameBinder} removeBinder={removeBinder} addSong={addRegionalSong}
    updateDisplaySettings={updateDisplaySettings} removeItem={removeItem} reorder={reorder}
  />;
}
