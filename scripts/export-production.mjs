import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));

try {
  const { values } = parseArgs({
    options: {
      path: { type: "string" },
      "env-file": { type: "string" },
      "include-file-storage": { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`Export the production Convex database to a ZIP snapshot.

Usage: npm run db:export:prod -- [options]

  --path <file.zip>        Output file (default: local/exports/production-<timestamp>.zip)
  --env-file <file>        Convex credentials/selection file (otherwise uses CLI defaults)
  --include-file-storage  Include uploaded file contents
  -h, --help              Show this help

Uses your Convex login or CONVEX_DEPLOY_KEY. Any deployment key must be a
production key: Convex deployment keys take precedence over --prod.
Existing output files are never overwritten.`);
  } else {
    const timestamp = new Date().toISOString().replaceAll(":", "-");
    const output = resolve(root, values.path ?? `local/exports/production-${timestamp}.zip`);
    if (!output.endsWith(".zip")) throw new Error("Output path must end in .zip");
    if (existsSync(output)) throw new Error(`Output already exists: ${output}`);
    mkdirSync(dirname(output), { recursive: true, mode: 0o700 });

    // Restrict permissions on newly created snapshot files and directories.
    process.umask(0o077);
    const args = ["export", "--prod", "--path", output];
    if (values["env-file"]) args.push("--env-file", resolve(root, values["env-file"]));
    if (values["include-file-storage"]) args.push("--include-file-storage");

    console.log(`Exporting production snapshot to ${output}`);
    const result = spawnSync(process.execPath, [resolve(root, "node_modules/convex/bin/main.js"), ...args], {
      cwd: root,
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
    if (process.exitCode === 0) console.log(`Saved ${output}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
