import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PublicBinderPage } from "@/components/binders/public-binder";
import { BinderDetail } from "@/components/binders/binder-detail";

export default async function BinderPage({ params }: { params: Promise<{ id: string }> }) {
  const signedIn = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && (await auth()).userId;
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return redirect("/binders");
  const { id } = await params;
  if (!signedIn) return <PublicBinderPage id={id} key={id} />;
  return <BinderDetail id={id} key={id} />;
}
