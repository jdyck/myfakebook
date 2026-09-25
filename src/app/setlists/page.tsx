import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { SetListsIndex } from "@/components/workspace/set-lists";

export default async function SetListsPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  if (!clerkConfigured || !(await auth()).userId) return redirect("/songs");
  if (convexConfigured) return <SetListsIndex />;

  return (
    <div className="min-h-screen">
      <Header clerkConfigured />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">Set lists</h1>
        <p className="mt-2 text-sm text-(--muted-soft)">Connect Convex to create and save set lists.</p>
      </main>
    </div>
  );
}
