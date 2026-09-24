import { PublicLibraryBackedWorkspace } from "@/components/workspace/public-library-backed-workspace";
import { MyFakebookWorkspace } from "@/components/workspace/my-fakebook-workspace";
import { PUBLIC_LIBRARY } from "@/lib/public-library";

export default function Home() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  if (convexConfigured) {
    return (
      <PublicLibraryBackedWorkspace
        clerkConfigured={clerkConfigured}
        persistenceEnabled={clerkConfigured && convexConfigured}
        fallbackSongs={PUBLIC_LIBRARY}
      />
    );
  }

  return (
    <MyFakebookWorkspace
      clerkConfigured={clerkConfigured}
      persistenceEnabled={clerkConfigured && convexConfigured}
      publicSongs={PUBLIC_LIBRARY}
    />
  );
}
