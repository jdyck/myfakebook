import { PublicLibraryBackedWorkspace } from "@/components/workspace/public-library-backed-workspace";
import { notFound } from "next/navigation";

export default async function SongPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const setListId = typeof query.setListId === "string" ? query.setListId : undefined;
  const setListItemId = typeof query.setListItemId === "string" ? query.setListItemId : undefined;
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  if (convexConfigured) {
    return (
      <PublicLibraryBackedWorkspace
        clerkConfigured={clerkConfigured}
        persistenceEnabled={clerkConfigured}
        initialPublicSongId={id}
        setListId={setListId}
        setListItemId={setListItemId}
      />
    );
  }

  notFound();
}
