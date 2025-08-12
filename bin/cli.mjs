#!/usr/bin/env node

// ESM wrapper for better npx compatibility
async function main() {
  const { runCLI } = await import("../dist/main.js");
  await runCLI();
}

main().catch(console.error);
