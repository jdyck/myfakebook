import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { MyLibraryListBacked, MyLibraryList } from "@/components/workspace/my-library-list";

export default async function MyLibraryPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  if (!clerkConfigured || !(await auth()).userId) {
    return redirect("/songs");
  }

  if (convexConfigured) {
    return <MyLibraryListBacked />;
  }

  return <MyLibraryList songs={[]} />;
}
