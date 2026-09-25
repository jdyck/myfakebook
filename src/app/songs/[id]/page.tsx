import { PublicLibraryBackedWorkspace } from "@/components/workspace/public-library-backed-workspace";
import { MyFakebookWorkspace } from "@/components/workspace/my-fakebook-workspace";
import { PUBLIC_LIBRARY } from "@/lib/public-library";
import { notFound } from "next/navigation";

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  if (convexConfigured) {
    return (
      <PublicLibraryBackedWorkspace
        clerkConfigured={clerkConfigured}
        persistenceEnabled={clerkConfigured}
        fallbackSongs={PUBLIC_LIBRARY}
        initialPublicSongId={id}
      />
    );
  }

  if (!PUBLIC_LIBRARY.some((song) => song.id === id)) notFound();

  return (
    <MyFakebookWorkspace
      clerkConfigured={clerkConfigured}
      persistenceEnabled={false}
      publicSongs={PUBLIC_LIBRARY}
      initialPublicSongId={id}
    />
  );
}
