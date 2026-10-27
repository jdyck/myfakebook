"use client";

import type { ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

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
      {children}
    </ConvexProviderWithClerk>
  );
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
