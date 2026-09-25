import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SetListDetail } from "@/components/workspace/set-lists";

export default async function SetListPage({ params }: { params: Promise<{ id: string }> }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !(await auth()).userId) return redirect("/songs");
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return redirect("/setlists");
  const { id } = await params;
  return <SetListDetail id={id} key={id} />;
}
