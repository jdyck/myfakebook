import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { BindersIndex, BindersList } from "@/components/binders/binders-index";

export default async function BindersPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  if (!clerkConfigured || !(await auth()).userId) return redirect("/songs");
  if (convexConfigured) return <BindersIndex />;

  return <BindersList binders={[]} />;
}
