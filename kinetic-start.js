import { cp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(args) {
  const result = spawnSync(npm, args, {
    cwd: root,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(["--prefix", "api", "install"]);
run(["run", "build:site"]);
run(["run", "build:api"]);

await rm(resolve(root, "site"), { recursive: true, force: true });
await rm(resolve(root, "migrations"), { recursive: true, force: true });

await cp(resolve(root, "out"), resolve(root, "site"), { recursive: true });
await cp(resolve(root, "api/migrations"), resolve(root, "migrations"), {
  recursive: true
});

await import(pathToFileURL(resolve(root, "api/dist/server.js")).href);
