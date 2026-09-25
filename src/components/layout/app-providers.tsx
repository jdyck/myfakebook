"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient, useConvexAuth, useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

import { api } from "../../../convex/_generated/api";
import { PUBLIC_LIBRARY } from "@/lib/public-library";

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;
const clerkAppearance = {
  variables: {
    colorBackground: "var(--paper)",
    colorForeground: "var(--ink)",
    colorPrimary: "var(--accent)",
    colorPrimaryForeground: "#ffffff",
    colorMuted: "var(--paper-soft)",
    colorMutedForeground: "var(--muted)",
    colorNeutral: "var(--ink)",
    colorInput: "var(--paper)",
    colorInputForeground: "var(--ink)",
    colorRing: "var(--accent)",
  },
  elements: {
    cardBox: "border shadow-sm",
    popoverBox: "border shadow-sm",
  },
};

function AuthenticatedConvexProvider({
  children,
}: {
  children: ReactNode;
}) {
  if (!convexClient) return children;

  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      <LegacySongMigration>{children}</LegacySongMigration>
    </ConvexProviderWithClerk>
  );
}

function LegacySongMigration({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();
  const migrateMine = useMutation(api.songs.migrateMine);
  const ensureCatalogSongs = useMutation(api.songs.ensureCatalogSongs);
  const userId = user?.id;
  const isAdmin = user?.publicMetadata.role === "admin";
  const [result, setResult] = useState<{ userId: string; attempt: number; state: "ready" | "error" } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !userId) return;
    let active = true;
    async function migrateLegacySongs() {
      let hasMore = true;
      while (active && hasMore) {
        const result = await migrateMine({});
        hasMore = result.hasMore;
      }
      if (active && isAdmin) {
        await ensureCatalogSongs({
          songs: PUBLIC_LIBRARY.map(({ id, title, writers, rhythm, abc }) => ({ id, title, writers, rhythm, abc })),
        });
      }
    }
    void migrateLegacySongs()
      .then(() => { if (active) setResult({ userId, attempt, state: "ready" }); })
      .catch(() => { if (active) setResult({ userId, attempt, state: "error" }); });
    return () => { active = false; };
  }, [attempt, ensureCatalogSongs, isAdmin, isAuthenticated, isLoading, migrateMine, userId]);

  const state = isAuthenticated && userId && result?.userId === userId && result.attempt === attempt
    ? result.state
    : "loading";
  if (state === "error") {
    return (
      <main className="grid min-h-screen place-items-center gap-3 p-6" role="alert">
        <div className="text-center">
          <p>Couldn’t load your songs.</p>
          <button className="mt-3 rounded-lg bg-(--accent) px-3 py-2 text-sm text-white" onClick={() => setAttempt((value) => value + 1)} type="button">Try again</button>
        </div>
      </main>
    );
  }
  if (isLoading || (isAuthenticated && state !== "ready")) return <main className="grid min-h-screen place-items-center" role="status">Loading songs…</main>;
  return children;
}

export function AppProviders({ children }: { children: ReactNode }) {
  if (clerkPublishableKey && convexClient) {
    return (
      <ClerkProvider appearance={clerkAppearance} publishableKey={clerkPublishableKey}>
        <AuthenticatedConvexProvider>{children}</AuthenticatedConvexProvider>
      </ClerkProvider>
    );
  }

  if (clerkPublishableKey) {
    return (
      <ClerkProvider appearance={clerkAppearance} publishableKey={clerkPublishableKey}>
        {children}
      </ClerkProvider>
    );
  }

  if (convexClient) {
    return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
  }

  return children;
}
