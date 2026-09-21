import { MyFakebookWorkspace } from "@/components/my-fakebook-workspace";
import { PUBLIC_CATALOG } from "@/lib/public-catalog";

export default function Home() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <MyFakebookWorkspace
      clerkConfigured={clerkConfigured}
      persistenceEnabled={clerkConfigured && convexConfigured}
      catalog={PUBLIC_CATALOG}
    />
  );
}
