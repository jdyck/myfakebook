import { PublicSongsList, PublicSongsListBacked } from "@/components/workspace/public-songs-list";

export default function SongsPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <PublicSongsListBacked clerkConfigured={clerkConfigured} />;
  }
  return (
    <PublicSongsList
      clerkConfigured={clerkConfigured}
      songs={[]}
    />
  );
}
