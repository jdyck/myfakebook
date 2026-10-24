import { fileURLToPath } from "node:url";

// Exact viewer-only replacements; never alias the whole Next.js package.
const config = {
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: fileURLToPath(new URL("./next/link.tsx", import.meta.url)) },
      { find: /^next\/image$/, replacement: fileURLToPath(new URL("./next/image.tsx", import.meta.url)) },
    ],
  },
};
export default config;
