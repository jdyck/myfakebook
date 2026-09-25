import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PrivateSongBackedWorkspace } from "@/components/workspace/private-song-backed-workspace";

export default async function MyLibrarySongPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !(await auth()).userId) {
    return redirect("/songs");
  }
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return redirect("/mylibrary");

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const setListId = typeof query.setListId === "string" ? query.setListId : undefined;
  const setListItemId = typeof query.setListItemId === "string" ? query.setListItemId : undefined;
  return <PrivateSongBackedWorkspace id={id} setListId={setListId} setListItemId={setListItemId} />;
}
