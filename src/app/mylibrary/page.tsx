import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { MyLibraryListBacked, MyLibraryListUnconfigured } from "@/components/library/my-library/my-library-list-backed";

export default async function MyLibraryPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  if (!clerkConfigured || !(await auth()).userId) {
    return redirect("/songs");
  }

  if (convexConfigured) {
    return <MyLibraryListBacked />;
  }

  return <MyLibraryListUnconfigured />;
}
