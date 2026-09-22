import type { MutationCtx, QueryCtx } from "./_generated/server";

type AuthContext =
  | Pick<QueryCtx, "auth">
  | Pick<MutationCtx, "auth">;

export async function requireAdmin(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  const metadata = identity.metadata as
    | { role?: string }
    | undefined;

  if (metadata?.role !== "admin") {
    throw new Error("Not authorized");
  }

  return identity;
}
