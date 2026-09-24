import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type PrivateSongId = Id<"privateSongs"> | Id<"scores">;
export type PublicSongId = Id<"publicSongs"> | Id<"catalogCharts">;

type ReadCtx = QueryCtx | MutationCtx;
type PrivateSongData = Pick<Doc<"privateSongs">, "ownerId" | "title" | "abc" | "updatedAt">;
type PublicSongData = Pick<
  Doc<"publicSongs">,
  "title" | "writers" | "rhythm" | "abc" | "status" | "createdBy" | "updatedAt" | "publishedAt"
>;

async function privatePairByLegacyId(ctx: ReadCtx, legacyId: Id<"scores">) {
  const canonical = await ctx.db
    .query("privateSongs")
    .withIndex("by_legacyScoreId", (query) => query.eq("legacyScoreId", legacyId))
    .first();
  const legacy = await ctx.db.get("scores", legacyId);
  return { canonical, legacy };
}

async function publicPairByLegacyId(ctx: ReadCtx, legacyId: Id<"catalogCharts">) {
  const canonical = await ctx.db
    .query("publicSongs")
    .withIndex("by_legacyCatalogChartId", (query) => query.eq("legacyCatalogChartId", legacyId))
    .first();
  const legacy = await ctx.db.get("catalogCharts", legacyId);
  return { canonical, legacy };
}

export async function getPrivateSongPair(ctx: ReadCtx, id: PrivateSongId) {
  const canonicalId = ctx.db.normalizeId("privateSongs", id);
  if (canonicalId) {
    const canonical = await ctx.db.get("privateSongs", canonicalId);
    if (!canonical) return { canonical: null, legacy: null };
    const legacy = canonical.legacyScoreId ? await ctx.db.get("scores", canonical.legacyScoreId) : null;
    return { canonical, legacy };
  }

  const legacyId = ctx.db.normalizeId("scores", id);
  if (!legacyId) return { canonical: null, legacy: null };
  return privatePairByLegacyId(ctx, legacyId);
}

export async function getPublicSongPair(ctx: ReadCtx, id: PublicSongId) {
  const canonicalId = ctx.db.normalizeId("publicSongs", id);
  if (canonicalId) {
    const canonical = await ctx.db.get("publicSongs", canonicalId);
    if (!canonical) return { canonical: null, legacy: null };
    const legacy = canonical.legacyCatalogChartId
      ? await ctx.db.get("catalogCharts", canonical.legacyCatalogChartId)
      : null;
    return { canonical, legacy };
  }

  const legacyId = ctx.db.normalizeId("catalogCharts", id);
  if (!legacyId) return { canonical: null, legacy: null };
  return publicPairByLegacyId(ctx, legacyId);
}

function privateSongView(
  canonical: Doc<"privateSongs"> | null,
  legacy: Doc<"scores"> | null,
  idStyle: "canonical" | "legacy",
) {
  const source = canonical ?? legacy;
  if (!source) return null;
  return {
    _id:
      idStyle === "legacy"
        ? (legacy?._id ?? canonical!._id)
        : (canonical?._id ?? legacy!._id),
    _creationTime: source._creationTime,
    ownerId: source.ownerId,
    title: source.title,
    abc: source.abc,
    updatedAt: source.updatedAt,
  };
}

function publicSongView(
  canonical: Doc<"publicSongs"> | null,
  legacy: Doc<"catalogCharts"> | null,
  idStyle: "canonical" | "legacy",
) {
  const source = canonical ?? legacy;
  if (!source) return null;
  return {
    _id:
      idStyle === "legacy"
        ? (legacy?._id ?? canonical!._id)
        : (canonical?._id ?? legacy!._id),
    _creationTime: source._creationTime,
    title: source.title,
    writers: source.writers,
    rhythm: source.rhythm,
    abc: source.abc,
    status: source.status,
    createdBy: source.createdBy,
    updatedAt: source.updatedAt,
    publishedAt: source.publishedAt,
  };
}

export async function listPrivateSongs(ctx: ReadCtx, ownerId: string, idStyle: "canonical" | "legacy") {
  const [canonicalSongs, legacySongs] = await Promise.all([
    ctx.db
      .query("privateSongs")
      .withIndex("by_owner_updatedAt", (query) => query.eq("ownerId", ownerId))
      .order("desc")
      .take(8),
    ctx.db
      .query("scores")
      .withIndex("by_owner_updatedAt", (query) => query.eq("ownerId", ownerId))
      .order("desc")
      .take(8),
  ]);

  const legacyById = new Map(legacySongs.map((song) => [song._id, song]));
  const matchedLegacyIds = new Set<Id<"scores">>();
  const rows = canonicalSongs.map((song) => {
    const legacy = song.legacyScoreId ? legacyById.get(song.legacyScoreId) ?? null : null;
    if (legacy) matchedLegacyIds.add(legacy._id);
    return privateSongView(song, legacy, idStyle)!;
  });

  for (const song of legacySongs) {
    if (!matchedLegacyIds.has(song._id)) rows.push(privateSongView(null, song, idStyle)!);
  }

  return rows.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
}

export async function listPublicSongs(ctx: ReadCtx, idStyle: "canonical" | "legacy", status?: "draft" | "published") {
  const [canonicalSongs, legacySongs] = await Promise.all([
    status
      ? ctx.db
          .query("publicSongs")
          .withIndex("by_status", (query) => query.eq("status", status))
          .order("desc")
          .collect()
      : ctx.db.query("publicSongs").order("desc").collect(),
    status
      ? ctx.db
          .query("catalogCharts")
          .withIndex("by_status", (query) => query.eq("status", status))
          .order("desc")
          .collect()
      : ctx.db.query("catalogCharts").order("desc").collect(),
  ]);

  const legacyById = new Map(legacySongs.map((song) => [song._id, song]));
  const matchedLegacyIds = new Set<Id<"catalogCharts">>();
  const rows = canonicalSongs.map((song) => {
    const legacy = song.legacyCatalogChartId ? legacyById.get(song.legacyCatalogChartId) ?? null : null;
    if (legacy) matchedLegacyIds.add(legacy._id);
    return publicSongView(song, legacy, idStyle)!;
  });

  for (const song of legacySongs) {
    if (!matchedLegacyIds.has(song._id)) rows.push(publicSongView(null, song, idStyle)!);
  }

  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function savePrivateSong(
  ctx: MutationCtx,
  ownerId: string,
  data: Omit<PrivateSongData, "ownerId">,
  requestedId?: PrivateSongId,
) {
  const values = { ...data, ownerId };
  let pair = requestedId ? await getPrivateSongPair(ctx, requestedId) : { canonical: null, legacy: null };
  if (requestedId && (!pair.canonical && !pair.legacy || (pair.canonical ?? pair.legacy)!.ownerId !== ownerId)) {
    throw new Error("Private song not found");
  }

  if (!requestedId) {
    const canonical = await ctx.db
      .query("privateSongs")
      .withIndex("by_owner", (query) => query.eq("ownerId", ownerId))
      .filter((query) => query.and(query.eq(query.field("title"), data.title), query.eq(query.field("abc"), data.abc)))
      .order("desc")
      .first();
    const legacy = await ctx.db
      .query("scores")
      .withIndex("by_owner", (query) => query.eq("ownerId", ownerId))
      .filter((query) => query.and(query.eq(query.field("title"), data.title), query.eq(query.field("abc"), data.abc)))
      .order("desc")
      .first();
    pair = canonical
      ? {
          canonical,
          legacy: canonical.legacyScoreId ? await ctx.db.get("scores", canonical.legacyScoreId) : legacy,
        }
      : legacy
        ? await privatePairByLegacyId(ctx, legacy._id)
        : { canonical: null, legacy: null };
  }

  let legacyId: Id<"scores">;
  if (pair.legacy) {
    legacyId = pair.legacy._id;
    await ctx.db.patch("scores", legacyId, values);
  } else {
    legacyId = await ctx.db.insert("scores", values);
  }

  if (pair.canonical) {
    await ctx.db.patch("privateSongs", pair.canonical._id, { ...values, legacyScoreId: legacyId });
    return { canonicalId: pair.canonical._id, legacyId };
  }

  const canonicalId = await ctx.db.insert("privateSongs", { ...values, legacyScoreId: legacyId });
  return { canonicalId, legacyId };
}

export async function removePrivateSong(ctx: MutationCtx, id: PrivateSongId, ownerId: string) {
  const pair = await getPrivateSongPair(ctx, id);
  const source = pair.canonical ?? pair.legacy;
  if (!source || source.ownerId !== ownerId) throw new Error("Private song not found");
  if (pair.canonical) await ctx.db.delete("privateSongs", pair.canonical._id);
  if (pair.legacy) await ctx.db.delete("scores", pair.legacy._id);
  return id;
}

export async function createPublicSong(ctx: MutationCtx, data: PublicSongData, idStyle: "canonical" | "legacy") {
  const legacyId = await ctx.db.insert("catalogCharts", data);
  const canonicalId = await ctx.db.insert("publicSongs", { ...data, legacyCatalogChartId: legacyId });
  return idStyle === "legacy" ? legacyId : canonicalId;
}

export async function updatePublicSongStatus(
  ctx: MutationCtx,
  id: PublicSongId,
  status: "draft" | "published",
  now: number,
) {
  const pair = await getPublicSongPair(ctx, id);
  if (!pair.canonical && !pair.legacy) throw new Error("Public song not found");
  const patch = status === "published" ? { status, publishedAt: now, updatedAt: now } : { status, updatedAt: now };
  if (pair.canonical) await ctx.db.patch("publicSongs", pair.canonical._id, patch);
  if (pair.legacy) await ctx.db.patch("catalogCharts", pair.legacy._id, patch);
  return id;
}

export async function removePublicSong(ctx: MutationCtx, id: PublicSongId) {
  const pair = await getPublicSongPair(ctx, id);
  if (!pair.canonical && !pair.legacy) throw new Error("Public song not found");
  if (pair.canonical) await ctx.db.delete("publicSongs", pair.canonical._id);
  if (pair.legacy) await ctx.db.delete("catalogCharts", pair.legacy._id);
  return id;
}
