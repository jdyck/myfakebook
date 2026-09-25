import { PublicLibraryBackedWorkspace } from "@/components/workspace/public-library-backed-workspace";
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
        initialPublicSongId={id}
      />
    );
  }

  notFound();
}
