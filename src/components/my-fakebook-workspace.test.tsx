// @vitest-environment jsdom
// @vitest-environment-options {"url":"http://localhost:3000"}

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { MyFakebookWorkspace } from "./my-fakebook-workspace";
import { PUBLIC_CATALOG } from "@/lib/public-catalog";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("MyFakebookWorkspace", () => {
  let container: HTMLDivElement | undefined;
  let unmount: (() => void) | undefined;

  afterEach(async () => {
    if (unmount) {
      await act(async () => {
        unmount?.();
      });
    }
    container?.remove();
    window.localStorage?.clear();
    container = undefined;
    unmount = undefined;
  });

  it("wires the public chart into the editor and abcjs preview", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    await act(async () => {
      root.render(
        <MyFakebookWorkspace clerkConfigured={false} persistenceEnabled={false} catalog={PUBLIC_CATALOG} />,
      );
    });

    const editor = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="ABC notation source"]');
    expect(editor).not.toBeNull();
    expect(editor?.value).toContain("T:Oh, Lady Be Good!");
    expect(container.textContent).toContain("Public catalog");

    const renderedLeadSheet = container.querySelector('[aria-label="Rendered lead sheet"]');
    expect(renderedLeadSheet?.querySelector("svg")?.getAttribute("aria-label")).toBe(
      'Sheet Music for "Oh, Lady Be Good!"',
    );
  });

  it("lets a guest start and edit a draft while keeping the preview connected", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    await act(async () => {
      root.render(
        <MyFakebookWorkspace clerkConfigured={false} persistenceEnabled={false} catalog={PUBLIC_CATALOG} />,
      );
    });

    const newButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "New",
    );
    expect(newButton).not.toBeUndefined();

    await act(async () => {
      newButton?.click();
    });

    const title = container.querySelector<HTMLInputElement>('input[aria-label="Lead sheet title"]');
    const editor = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="ABC notation source"]');
    const renderedLeadSheet = container.querySelector('[aria-label="Rendered lead sheet"]');

    expect(title?.value).toBe("Midnight Walk");
    expect(editor?.value).toContain("T:Midnight Walk");
    expect(container.textContent).toContain("Guest draft");
    expect(renderedLeadSheet?.querySelector("svg")?.getAttribute("aria-label")).toBe(
      'Sheet Music for "Midnight Walk"',
    );

    const editedAbc = editor?.value.replace("T:Midnight Walk", "T:Guest edit");
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setValue?.call(editor, editedAbc);
      editor?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(editor?.value).toContain("T:Guest edit");
    expect(container.textContent).toContain("Guest draft");
    expect(container.querySelector('[aria-label="Rendered lead sheet"] svg')?.getAttribute("aria-label")).toBe(
      'Sheet Music for "Guest edit"',
    );
  });
});
