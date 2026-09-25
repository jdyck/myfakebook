import { PublicSongsList, PublicSongsListBacked } from "@/components/workspace/public-songs-list";
import { PUBLIC_LIBRARY } from "@/lib/public-library";

export default function SongsPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <PublicSongsListBacked clerkConfigured={clerkConfigured} fallbackSongs={PUBLIC_LIBRARY} />;
  }
  return (
    <PublicSongsList
      clerkConfigured={clerkConfigured}
      songs={PUBLIC_LIBRARY}
    />
  );
}
