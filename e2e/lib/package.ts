import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.join(import.meta.dirname, "..", "..");
const PACKAGE_NAME = "@saleor/configurator";

/**
 * Installs the CLI into `dir` with npm, as a user would, and returns its bin path.
 * `spec` is anything `npm install` takes: a published version or a packed tarball.
 */
export function installCli(dir: string, spec: string): string {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ private: true }));
  execFileSync("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error", spec], {
    cwd: dir,
    stdio: ["ignore", "ignore", "inherit"],
    timeout: 5 * 60_000,
  });
  return path.join(dir, "node_modules", ...PACKAGE_NAME.split("/"), "bin", "cli.mjs");
}

/** The newest published release, or `E2E_RELEASE_VERSION` when set. */
export function releaseSpec(): string {
  return `${PACKAGE_NAME}@${process.env.E2E_RELEASE_VERSION ?? "latest"}`;
}

/** Packs the checkout's build into a tarball, exactly what `npm publish` would upload. */
export function packCheckout(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  const output = execFileSync("pnpm", ["pack", "--pack-destination", dir], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 2 * 60_000,
  });
  const tarball = output.trim().split("\n").pop()?.trim();
  if (!tarball?.endsWith(".tgz")) throw new Error(`pnpm pack printed no tarball:\n${output}`);
  return path.isAbsolute(tarball) ? tarball : path.join(dir, tarball);
}
