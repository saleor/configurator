#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsxPath = resolve(__dirname, "../node_modules/.bin/tsx");
const mainPath = resolve(__dirname, "../src/cli/main.ts");

const child = spawn(tsxPath, [mainPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
