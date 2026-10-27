export function getCatalogCountry(request: Request): "US" | "other" {
  if (process.env.NODE_ENV === "development" && process.env.LOCAL_PUBLIC_CATALOG_COUNTRY === "US") {
    return "US";
  }

  const vercelCountry = request.headers.get("x-vercel-ip-country");
  if (vercelCountry !== null) return vercelCountry === "US" ? "US" : "other";

  return "other";
}

export function getConvexSiteUrl() {
  if (process.env.CONVEX_SITE_URL) return process.env.CONVEX_SITE_URL.replace(/\/$/, "");

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return undefined;

  const url = new URL(convexUrl);
  if (!url.hostname.endsWith(".convex.cloud")) return undefined;
  url.hostname = url.hostname.replace(/\.convex\.cloud$/, ".convex.site");
  return url.toString().replace(/\/$/, "");
}

