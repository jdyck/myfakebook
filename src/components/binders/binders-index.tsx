"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Roboto_Condensed } from "next/font/google";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { api } from "../../../convex/_generated/api";
import { Header } from "@/components/app-shell/header/header";
import { BindersListView } from "./binders-list-view";

const condensed = Roboto_Condensed({ subsets: ["latin"], display: "swap" });

export function BindersIndex() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const binders = useQuery(api.binders.listMine, isAuthenticated ? {} : "skip");
  const createBinder = useMutation(api.binders.create);

  return <BindersList
    binders={binders}
    loading={isLoading || (isAuthenticated && binders === undefined)}
    onCreate={async (name) => {
      const id = await createBinder({ name });
      router.push(`/binders/${encodeURIComponent(id)}`);
    }}
  />;
}

export function BindersList(props: ComponentProps<typeof BindersListView>) {
  return <BindersListView {...props} captionClassName={condensed.className} header={<Header clerkConfigured activeSection="binders" />} />;
}
