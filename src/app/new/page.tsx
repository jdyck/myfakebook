import { SongWorkspace } from "@/components/songs/workspace/song-workspace";

export default function NewSongPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <SongWorkspace
      clerkConfigured={clerkConfigured}
      persistenceEnabled={clerkConfigured && Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)}
      publishedSongs={[]}
      initialEditMode
    />
  );
}
