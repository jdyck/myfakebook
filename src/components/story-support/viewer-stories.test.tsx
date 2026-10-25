import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as binderDetails from "../binders/binder-detail-view.stories";
import * as binderLists from "../binders/binders-list-view.stories";
import * as binderActions from "../binders/save-to-binder-view.stories";
import * as publicLibrary from "../library/public-library/public-songs-list-view.stories";
import * as publication from "../library/public-library/publication-select.stories";
import * as preview from "../songs/preview/preview-panel.stories";

// These entry points must render without Clerk, Convex, or a Next.js router.
// A production viewer build alone does not execute the story components.
const groups = { binderDetails, binderLists, binderActions, publicLibrary, publication, preview };
describe("Standalone viewer stories", () => {
  for (const [group, exports] of Object.entries(groups)) {
    for (const [name, story] of Object.entries(exports)) {
      if (name === "default") continue;
      it(`${group}/${name} renders without application providers`, () => {
        expect(typeof story).toBe("function");
        expect(renderToStaticMarkup(createElement(story as ComponentType))).not.toBe("");
      });
    }
  }
});
