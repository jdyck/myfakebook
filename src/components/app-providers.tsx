"use client";

import type { ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

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
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <AuthenticatedConvexProvider>{children}</AuthenticatedConvexProvider>
      </ClerkProvider>
    );
  }

  if (clerkPublishableKey) {
    return <ClerkProvider publishableKey={clerkPublishableKey}>{children}</ClerkProvider>;
  }

  if (convexClient) {
    return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
  }

  return children;
}
