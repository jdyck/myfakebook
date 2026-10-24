import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { BinderDetail } from "@/components/binders";

export default async function BinderPage({ params }: { params: Promise<{ id: string }> }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !(await auth()).userId) return redirect("/songs");
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return redirect("/binders");
  const { id } = await params;
  return <BinderDetail id={id} key={id} />;
}
