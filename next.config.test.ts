import { getRedirectUrl, unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

describe("binder URL migration", () => {
  it.each([
    ["/setlists", "/binders"],
    ["/setlists/binder_1", "/binders/binder_1"],
    ["/setlists/legacy_1?setListItemId=item_1", "/binders/legacy_1?setListItemId=item_1"],
  ])("permanently redirects %s and preserves saved-link details", async (source, destination) => {
    const response = await unstable_getResponseFromNextConfig({ url: `https://myfakebook.test${source}`, nextConfig });
    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe(`https://myfakebook.test${destination}`);
  });

  it("keeps the new binder URL as the destination", async () => {
    const response = await unstable_getResponseFromNextConfig({ url: "https://myfakebook.test/binders/binder_1", nextConfig });
    expect(getRedirectUrl(response)).toBeNull();
  });
});
