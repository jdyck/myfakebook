// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ServiceWorkerRegistration } from "./service-worker-registration";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
const register = vi.fn();

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("navigator", { serviceWorker: { register } });
  register.mockResolvedValue({});
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  register.mockReset();
});

it("registers a root-scoped worker in production without changing the page", async () => {
  await act(async () => root.render(<ServiceWorkerRegistration />));
  expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" });
  expect(container.innerHTML).toBe("");
});

it("skips registration during development, on insecure origins, and in unsupported browsers", async () => {
  vi.stubEnv("NODE_ENV", "development");
  await act(async () => root.render(<ServiceWorkerRegistration key="dev" />));
  vi.stubEnv("NODE_ENV", "production");
  vi.stubGlobal("isSecureContext", false);
  await act(async () => root.render(<ServiceWorkerRegistration key="insecure" />));
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("navigator", {});
  await act(async () => root.render(<ServiceWorkerRegistration key="unsupported" />));
  expect(register).not.toHaveBeenCalled();
});

it("handles registration failure without an unhandled rejection", async () => {
  const error = new Error("Registration failed");
  register.mockRejectedValue(error);
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await act(async () => root.render(<ServiceWorkerRegistration />));
  expect(log).toHaveBeenCalledWith("Could not register the MyFakeBook service worker.", error);
});
