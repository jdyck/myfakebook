"use client";

import { useEffect, type ReactNode } from "react";
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
      <CatalogSongSync>{children}</CatalogSongSync>
    </ConvexProviderWithClerk>
  );
}

function CatalogSongSync({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();
  const ensureCatalogSongs = useMutation(api.songs.ensureCatalogSongs);
  const isAdmin = user?.publicMetadata.role === "admin";

  useEffect(() => {
    if (isLoading || !isAuthenticated || !isAdmin) return;
    void ensureCatalogSongs({
      songs: PUBLIC_LIBRARY.map(({ id, title, writers, rhythm, abc }) => ({ id, title, writers, rhythm, abc })),
    }).catch(() => undefined);
  }, [ensureCatalogSongs, isAdmin, isAuthenticated, isLoading]);

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
