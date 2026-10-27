// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import PreviewLink from "./link";
import PreviewImage from "./image";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("reports destinations while cancelling plain and modified preview navigation", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<PreviewLink href="/mylibrary">My Library</PreviewLink>));
    const link = container.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("#");
    expect(link.title).toContain("/mylibrary");
    for (const ctrlKey of [false, true]) {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey });
      await act(async () => { link.dispatchEvent(event); });
      expect(event.defaultPrevented).toBe(true);
      expect(container.querySelector('[role="status"]')?.textContent).toContain("Preview navigation: /mylibrary");
    }
  } finally {
    await act(async () => root.unmount());
  }
});

it("renders local assets with fill positioning or intrinsic dimensions", () => {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<>
    <PreviewImage src="/images/library/bassist.png" alt="Bass" fill sizes="190px" />
    <PreviewImage src="/images/library/bassist.png" alt="Bass thumbnail" width={28} height={42} />
  </>);
  const [photo, thumbnail] = container.querySelectorAll("img");
  expect(photo.getAttribute("src")).toBe("/images/library/bassist.png");
  expect(photo.style.position).toBe("absolute");
  expect(photo.style.width).toBe("100%");
  expect(photo.getAttribute("sizes")).toBe("190px");
  expect(thumbnail.width).toBe(28);
  expect(thumbnail.height).toBe(42);
  expect(thumbnail.alt).toBe("Bass thumbnail");
  expect(container.innerHTML).not.toContain("/_next/image");
});
