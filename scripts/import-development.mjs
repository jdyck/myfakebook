import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, parseEnv } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));

export function developmentDeployment(value) {
  const deployment = value?.trim();
  if (!/^dev:[a-zA-Z0-9-]+$/.test(deployment ?? "")) {
    throw new Error("CONVEX_DEPLOYMENT must be dev:<deployment-name> in the development env file. Run npx convex dev to link development first.");
  }
  return deployment;
}

export function copySongs(jsonl, ownerId, sourceOwner, replace = false) {
  if (!/^user_[a-zA-Z0-9]+$/.test(ownerId ?? "")) {
    throw new Error("Set DEV_CLERK_USER_ID in .env.local or pass --owner user_... (your development Clerk user ID).");
  }
  return jsonl.split(/\r?\n/).filter((line) => line.trim()).flatMap((line) => {
    const source = JSON.parse(line);
    if (!source || typeof source !== "object" || Array.isArray(source) || typeof source.ownerId !== "string") {
      throw new Error("Invalid song document in archive");
    }
    if (sourceOwner && source.ownerId !== sourceOwner) return [];
    if (replace && (!Number.isFinite(source._creationTime) || source._creationTime < 0)) {
      throw new Error("Replacement requires each song's original numeric _creationTime.");
    }
    const song = { ...source, ownerId, publicationState: "private", publicDomainTerritory: "none" };
    // Production IDs embed table numbers that can refer to different dev tables.
    const removedFields = ["_id", "publishedAt", "publicationTerritory", "catalogId"];
    if (!replace) removedFields.push("_creationTime");
    for (const field of removedFields) delete song[field];
    return [song];
  });
}

export function latestExport(directory) {
  const files = readdirSync(directory)
    .filter((name) => name.endsWith(".zip"))
    .map((name) => ({ path: join(directory, name), stat: statSync(join(directory, name)) }))
    .filter(({ stat }) => stat.isFile())
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs || b.path.localeCompare(a.path));
  if (!files.length) throw new Error(`No ZIP exports in ${directory}. Run npm run db:export:prod first.`);
  return files[0].path;
}

function main() {
  const { values } = parseArgs({ options: {
    path: { type: "string" },
    owner: { type: "string" },
    "source-owner": { type: "string" },
    "env-file": { type: "string", default: ".env.local" },
    "dry-run": { type: "boolean" },
    replace: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  } });
  if (values.help) {
    console.log(`Import song copies from a Convex export into development.

Usage: npm run db:import:dev -- [options]

  --path <file.zip>       Default: newest ZIP by modification time in local/exports/
  --owner <user_...>      Development Clerk user ID (or DEV_CLERK_USER_ID in env file)
  --source-owner <id>     Only copy songs belonging to this production owner
  --env-file <file>      Development settings (default: .env.local)
  --dry-run              Show source, destination and count without connecting
  --replace              Replace ALL development songs; new IDs, original creation times
  -h, --help             Show help

Appends private songs with new IDs; repeated runs create additional copies.
With --replace, replaces the entire songs table atomically (all owners).
Other tables remain; binder items referencing removed songs may become dangling.
Does not import binders, other tables, or file storage. Requires unzip and a
Convex CLI login with access to the development project. Deploy keys are ignored.`);
    return;
  }
  const envPath = resolve(root, values["env-file"]);
  const settings = parseEnv(readFileSync(envPath, "utf8"));
  const deployment = developmentDeployment(settings.CONVEX_DEPLOYMENT);
  const owner = values.owner ?? settings.DEV_CLERK_USER_ID;
  const archive = values.path ? resolve(root, values.path) : latestExport(resolve(root, "local/exports"));
  if (!existsSync(archive)) throw new Error(`Archive not found: ${archive}`);
  const extraction = spawnSync("unzip", ["-p", archive, "songs/documents.jsonl"], {
    encoding: "utf8", maxBuffer: 256 * 1024 * 1024,
  });
  if (extraction.error) throw extraction.error;
  if (extraction.status !== 0) throw new Error("Could not read songs/documents.jsonl from ZIP. Check the archive and that unzip is installed.");
  const songs = copySongs(extraction.stdout, owner, values["source-owner"], values.replace);
  console.log(`Source: ${archive}\nDestination: ${deployment}\nOwner: ${owner}\nMode: ${values.replace ? "REPLACE ALL development songs (new IDs, original creation times)" : "append new copies"}\nPrivate song copies: ${songs.length}`);
  if (values.replace && !songs.length) throw new Error("Refusing to replace development songs with an empty selection.");
  if (values["dry-run"] || !songs.length) return;

  const temporary = mkdtempSync(join(tmpdir(), "myfakebook-import-"));
  try {
    const data = join(temporary, "songs.jsonl");
    const envFile = join(temporary, "development.env");
    writeFileSync(data, songs.map((song) => JSON.stringify(song)).join("\n") + "\n", { mode: 0o600 });
    // Isolate selection from production keys in the shell or other .env files.
    writeFileSync(envFile, `CONVEX_DEPLOYMENT=${deployment}\n`, { mode: 0o600 });
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("CONVEX_")));
    const result = spawnSync(process.execPath, [
      resolve(root, "node_modules/convex/bin/main.js"), "import", data,
      "--table", "songs", ...(values.replace ? ["--replace", "--yes"] : ["--append"]), "--env-file", envFile,
    ], { cwd: root, env, stdio: "inherit" });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
