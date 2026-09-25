import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (!clerkConfigured || !(await auth()).userId) {
    return redirect("/songs");
  }

  return redirect("/mylibrary");
}
