"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { api } from "../../../convex/_generated/api";
import { Header } from "@/components/app-shell/header/header";
import { usePublicBinders } from "./public-binder";
import { BindersListView } from "./binders-list-view";

export function BindersIndex() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const binders = useQuery(api.binders.listMine, isAuthenticated ? {} : "skip");
  const { result: publicResult, error: publicError } = usePublicBinders();
  const combined = [...(binders ?? []), ...(publicResult?.binders ?? []).filter(binder => !binders?.some(owned => owned._id === binder._id))];
  const createBinder = useMutation(api.binders.create);

  return <BindersList
    binders={combined}
    loading={isLoading || (isAuthenticated && binders === undefined) || (!publicResult && !publicError)}
    onCreate={isAuthenticated ? async (name) => {
      const id = await createBinder({ name });
      router.push(`/binders/${encodeURIComponent(id)}`);
    } : undefined}
  />;
}

export function BindersList(props: ComponentProps<typeof BindersListView>) {
  return <BindersListView {...props} header={<Header clerkConfigured activeSection="binders" />} />;
}
