import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { Header } from "@/components/app-shell/header/header";
import { SetListsIndex } from "@/components/set-lists";
import componentStyles from "./page.module.css";

export default async function SetListsPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  if (!clerkConfigured || !(await auth()).userId) return redirect("/songs");
  if (convexConfigured) return <SetListsIndex />;

  return (
    <div className={componentStyles.pageShell}>
      <Header clerkConfigured />
      <main className={componentStyles.pageContent}>
        <h1 className={componentStyles.pageTitle}>Set lists</h1>
        <p className={componentStyles.pageDescription}>Connect Convex to create and save set lists.</p>
      </main>
    </div>
  );
}
