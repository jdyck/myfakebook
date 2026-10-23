import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { Header } from "@/components/app-shell/header/header";
import { BindersIndex } from "@/components/binders";
import componentStyles from "./page.module.css";

export default async function BindersPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  if (!clerkConfigured || !(await auth()).userId) return redirect("/songs");
  if (convexConfigured) return <BindersIndex />;

  return (
    <div className={componentStyles.pageShell}>
      <Header clerkConfigured />
      <main className={componentStyles.pageContent}>
        <h1 className={componentStyles.pageTitle}>Binders</h1>
        <p className={componentStyles.pageDescription}>Connect Convex to create and save binders.</p>
      </main>
    </div>
  );
}
