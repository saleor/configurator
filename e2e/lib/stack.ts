import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { gql } from "./saleor";

const COMPOSE_FILE = path.join(import.meta.dirname, "..", "compose.yml");
const PROJECT = "configurator-e2e";
const ADMIN = { email: "admin@example.com", password: "admin" };

export const saleorPort = () => Number(process.env.E2E_SALEOR_PORT ?? 18700);

const compose = (args: string[], env: Record<string, string> = {}) =>
  execFileSync("docker", ["compose", "--project-name", PROJECT, "-f", COMPOSE_FILE, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "inherit"],
    // A cold start pulls the images and runs every Saleor migration.
    timeout: 15 * 60_000,
  });

const log = (message: string) => process.stdout.write(`[e2e] ${message}\n`);

/** Starts an empty Saleor: migrated, one superuser, nothing else seeded. */
export function startStack(): void {
  log("removing any stack a previous run left behind");
  compose(["down", "--volumes", "--remove-orphans"]);
  log("starting Postgres and Valkey");
  compose(["up", "--detach", "--wait", "db", "cache"]);
  log("migrating Saleor");
  compose(["run", "--rm", "--no-deps", "api", "python3", "manage.py", "migrate", "--noinput"]);
  log("creating the admin");
  compose([
    "run",
    "--rm",
    "--no-deps",
    "--env",
    `DJANGO_SUPERUSER_PASSWORD=${ADMIN.password}`,
    "api",
    "python3",
    "manage.py",
    "createsuperuser",
    "--noinput",
    "--email",
    ADMIN.email,
  ]);
  log("starting the API and worker");
  compose(["up", "--detach", "--wait", "api", "worker"]);
}

/** Saves the Saleor logs next to the test results, then removes the stack and its volumes. */
export function stopStack(logDir: string): void {
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(
    path.join(logDir, "saleor.log"),
    compose(["logs", "--no-color", "api", "worker"])
  );
  if (process.env.E2E_KEEP_STACK) {
    log(`E2E_KEEP_STACK is set; the stack stays up (docker compose -p ${PROJECT} down -v)`);
    return;
  }
  compose(["down", "--volumes", "--remove-orphans"]);
}

/**
 * The CLI authenticates as an app holding every permission, the way users run it in CI.
 * The admin's JWT is only used to create that app.
 */
export async function createAppToken(apiUrl: string): Promise<string> {
  const { tokenCreate } = await gql<{ tokenCreate: { token: string } }>(
    apiUrl,
    `mutation($email: String!, $password: String!) {
      tokenCreate(email: $email, password: $password) { token errors { field message } }
    }`,
    ADMIN
  );
  const { shop } = await gql<{ shop: { permissions: { code: string }[] } }>(
    apiUrl,
    "{ shop { permissions { code } } }",
    {},
    tokenCreate.token
  );
  const { appCreate } = await gql<{ appCreate: { authToken: string } }>(
    apiUrl,
    `mutation($permissions: [PermissionEnum!]) {
      appCreate(input: { name: "configurator-e2e", permissions: $permissions }) {
        authToken
        errors { field message }
      }
    }`,
    { permissions: shop.permissions.map((permission) => permission.code) },
    tokenCreate.token
  );
  return appCreate.authToken;
}
