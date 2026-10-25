"use client";

import { Roboto_Condensed } from "next/font/google";

import { Header } from "@/components/app-shell/header/header";
import { EditorialLibraryView, type EditorialLibraryViewProps } from "./editorial-library-view";

const condensed = Roboto_Condensed({ subsets: ["latin"], display: "swap" });

type EditorialLibraryProps = Omit<EditorialLibraryViewProps, "header" | "captionClassName"> & {
  clerkConfigured: boolean;
};

export function EditorialLibrary({ clerkConfigured, ...props }: EditorialLibraryProps) {
  return <EditorialLibraryView {...props} header={<Header clerkConfigured={clerkConfigured} activeSection={props.section} />} captionClassName={condensed.className} />;
}
