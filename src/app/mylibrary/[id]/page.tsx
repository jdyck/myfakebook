import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PrivateSongBackedWorkspace } from "@/components/workspace/private-song-backed-workspace";

export default async function MyLibrarySongPage({ params }: { params: Promise<{ id: string }> }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !(await auth()).userId) {
    return redirect("/songs");
  }
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return redirect("/mylibrary");

  return <PrivateSongBackedWorkspace id={(await params).id} />;
}
