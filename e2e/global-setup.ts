import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import type { TestProject } from "vitest/node";
import { createAppToken, saleorPort, startStack, stopStack } from "./lib/stack";

const RESULTS_DIR = path.join(import.meta.dirname, "results");
const MEDIA_DIR = path.join(import.meta.dirname, "fixtures");

declare module "vitest" {
  export interface ProvidedContext {
    saleor: { apiUrl: string; token: string };
    /** Base URL of the product media fixtures, as the Saleor containers reach the host. */
    mediaBaseUrl: string;
  }
}

/**
 * Serves `fixtures/` so product media never depends on a third-party host. Saleor downloads
 * each image at deploy time, from inside its container.
 */
async function serveMediaFixtures(): Promise<http.Server> {
  const server = http.createServer((request, response) => {
    const file = path.join(MEDIA_DIR, path.basename(request.url ?? ""));
    if (!fs.existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": "image/png" });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolve) => server.listen(0, "0.0.0.0", resolve));
  return server;
}

/**
 * Starts a throwaway Saleor for the run, unless `E2E_SALEOR_URL` and `E2E_SALEOR_TOKEN` point
 * at one already running. Never point those at a store you care about: the suite writes to it.
 */
export default async function setup(project: TestProject) {
  const externalUrl = process.env.E2E_SALEOR_URL;
  if (externalUrl && !["localhost", "127.0.0.1"].includes(new URL(externalUrl).hostname)) {
    throw new Error(
      `E2E_SALEOR_URL must be a local Saleor from e2e/compose.yml, got ${externalUrl}`
    );
  }
  const ownsStack = !externalUrl;
  try {
    if (ownsStack) startStack();

    const apiUrl = externalUrl ?? `http://localhost:${saleorPort()}/graphql/`;
    const token = process.env.E2E_SALEOR_TOKEN ?? (await createAppToken(apiUrl));
    const media = await serveMediaFixtures();
    const { port } = media.address() as AddressInfo;

    project.provide("saleor", { apiUrl, token });
    project.provide("mediaBaseUrl", `http://host.docker.internal:${port}`);

    return () => {
      media.close();
      if (ownsStack) stopStack(RESULTS_DIR);
    };
  } catch (error) {
    // Vitest only runs the teardown we return, so a failed setup saves the logs itself.
    if (ownsStack) stopStack(RESULTS_DIR);
    throw error;
  }
}
