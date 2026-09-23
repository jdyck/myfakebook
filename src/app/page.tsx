import { CatalogBackedWorkspace } from "@/components/catalog-backed-workspace";
import { MyFakebookWorkspace } from "@/components/my-fakebook-workspace";
import { PUBLIC_CATALOG } from "@/lib/public-catalog";

export default function Home() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  if (convexConfigured) {
    return (
      <CatalogBackedWorkspace
        clerkConfigured={clerkConfigured}
        persistenceEnabled={clerkConfigured && convexConfigured}
        fallbackCatalog={PUBLIC_CATALOG}
      />
    );
  }

  return (
    <MyFakebookWorkspace
      clerkConfigured={clerkConfigured}
      persistenceEnabled={clerkConfigured && convexConfigured}
      catalog={PUBLIC_CATALOG}
    />
  );
}
