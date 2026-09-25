import { MyFakebookWorkspace } from "@/components/workspace/my-fakebook-workspace";

export default function NewSongPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <MyFakebookWorkspace
      clerkConfigured={clerkConfigured}
      persistenceEnabled={clerkConfigured && Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)}
      publicSongs={[]}
    />
  );
}
