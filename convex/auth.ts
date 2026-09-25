import type { MutationCtx, QueryCtx } from "./_generated/server";

type AuthContext =
  | Pick<QueryCtx, "auth">
  | Pick<MutationCtx, "auth">;

type UserIdentity = NonNullable<
  Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>
>;

export async function requireUser(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  return identity;
}

export async function requireOwner(ctx: AuthContext) {
  return (await requireUser(ctx)).subject;
}

export function isAdmin(identity: UserIdentity) {
  const metadata = identity.metadata as
    | { role?: string }
    | undefined;

  return metadata?.role === "admin";
}

export async function requireAdmin(ctx: AuthContext) {
  const identity = await requireUser(ctx);

  if (!isAdmin(identity)) throw new Error("Not authorized");

  return identity;
}
