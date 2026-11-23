/*
 * verify-configurator: runs the configurator CLI against the shared Saleor Cloud sandbox (or a
 * local Saleor), the way a user does, and proves every result with an independent GraphQL read.
 * One run at a time per Saleor host: deploys change the whole store.
 *
 * Rules: .claude/skills/verify-configurator/references/verification-rules.md
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------------------------
// Facts about the configurator, each cited in SKILL.md.

const PACKAGE = "@saleor/configurator";
const PLAYWRIGHT_VERSION = "1.62.1";
const APP_NAME = "verify-configurator";
/** Commands that talk to Saleor and take --url/--token (`start` prompts for them instead). */
const REMOTE_COMMANDS = new Set(["introspect", "deploy", "diff"]);
const isRemote = (args: string[]) =>
  REMOTE_COMMANDS.has(args[0]) || (args[0] === "recipe" && args[1] === "apply");
/** Paths whose change requires the upgrade check (V6): the config file format and what the CLI stores on the instance. */
const STORAGE_PATHS = [
  "src/modules/config/schema/",
  "src/modules/config/config-service.ts",
  "src/modules/config/parse-configuration.ts",
  "src/modules/product/media-metadata.ts",
  "src/lib/utils/selective-options.ts",
];
/** Every feature file; `report` lists those no passed scenario exercised (V13). */
const FEATURES = [
  "introspect",
  "deploy",
  "diff",
  "selective",
  "validate-schema",
  "recipe",
  "interactive",
  "upgrade",
];
const SEED_SECTIONS =
  "channels,warehouses,productAttributes,productTypes,categories,collections,products";
const HEARTBEAT_TTL_MS = 45 * 60_000;

// ---------------------------------------------------------------------------------------------
// Paths.

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.dirname(SCRIPT_DIR);
const REPO = sh("git", ["-C", SCRIPT_DIR, "rev-parse", "--show-toplevel"]).out;
const HOME = os.homedir();
const SHARED_CONFIG = path.join(HOME, ".config/verify-saleor/config.json");
const CREDENTIALS = path.join(HOME, ".config/verify-configurator/credentials.json");
const CACHE_DIR = path.join(HOME, ".cache/verify-configurator");
const RUNTIME_DIR = path.join(CACHE_DIR, "runtime");
const PROFILE_DIR = path.join(CACHE_DIR, "chrome-profile");
const SESSION_COOKIES = path.join(CACHE_DIR, "session-cookies.json");
const SESSION_COOKIE_DOMAINS =
  /(^|\.)(auth\.saleor\.io|cloud\.saleor\.io|saleor\.cloud|google\.com)$/;
const LOCK_DIR = path.join(HOME, ".cache/verify-saleor/locks");
const RUN_ROOT = "/tmp/verify-configurator";

// ---------------------------------------------------------------------------------------------
// Small utilities.

function die(message: string, code = 1): never {
  console.error(`verify-configurator: ${message}`);
  process.exit(code);
}

function log(message: string) {
  console.log(`[verify-configurator ${new Date().toISOString().slice(11, 19)}] ${message}`);
}

function sh(
  cmd: string,
  args: string[],
  options: { cwd?: string; allowFail?: boolean; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {}
) {
  const result = spawnSync(cmd, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    maxBuffer: 256 * 1024 * 1024,
    timeout: options.timeoutMs,
  });
  if (result.status !== 0 && !options.allowFail) {
    die(
      `${cmd} ${args[0] ?? ""} failed (${result.status}):\n${(result.stderr || result.stdout || "").slice(-2000)}`
    );
  }
  return {
    ok: result.status === 0,
    status: result.status ?? -1,
    out: (result.stdout ?? "").trim(),
    err: (result.stderr ?? "").trim(),
  };
}

const git = (args: string[], cwd = REPO) => sh("git", ["-C", cwd, ...args]).out;

function readJson<T>(file: string, fallback?: T): T {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    die(`${file} is missing.`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function writeJson(file: string, value: unknown, mode?: number) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, mode ? { mode } : undefined);
  if (mode) fs.chmodSync(file, mode);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Every wait has a timeout and prints progress (V17). */
async function poll<T>(
  label: string,
  check: () => Promise<T | undefined | false | null> | T | undefined | false | null,
  { timeoutMs = 60_000, intervalMs = 2_000 } = {}
): Promise<T> {
  const started = Date.now();
  let lastReport = started;
  let lastError: unknown;
  for (;;) {
    try {
      const value = await check();
      if (value) return value as T;
    } catch (error) {
      lastError = error;
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(
        `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for ${label}${lastError ? `: ${String(lastError)}` : ""}`
      );
    }
    if (Date.now() - lastReport > 10_000) {
      log(`still waiting for ${label} (${Math.round((Date.now() - started) / 1000)}s)`);
      lastReport = Date.now();
    }
    await sleep(intervalMs);
  }
}

const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const shortSha = () => git(["rev-parse", "--short", "HEAD"]);

function parseFlags(argv: string[]) {
  const flags: Record<string, string | true> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (arg.startsWith("--")) {
      const [key, inline] = arg.slice(2).split(/=(.*)/s);
      const next = argv[i + 1];
      if (inline !== undefined) flags[key] = inline;
      else if (next !== undefined && (!next.startsWith("--") || key === "note")) {
        flags[key] = next;
        i++;
      } else flags[key] = true;
    } else positional.push(arg);
  }
  return { flags, positional };
}

// ---------------------------------------------------------------------------------------------
// Target (V1) and credentials.

type SharedConfig = {
  target: "cloud" | "local";
  cloud?: { saleorApiUrl: string; dashboardUrl?: string; cloudSso?: string };
  local?: { saleorApiUrl?: string; saleorVersion?: string };
};
type Target = { kind: "cloud" | "local"; saleorApiUrl: string; dashboardUrl: string; host: string };

function resolveTarget(override?: string): Target {
  if (!fs.existsSync(SHARED_CONFIG)) {
    die(
      `${SHARED_CONFIG} is missing. Ask the user for the Cloud sandbox's GraphQL URL, then write:\n${JSON.stringify(
        {
          target: "cloud",
          cloud: {
            saleorApiUrl: "https://<env>.saleor.cloud/graphql/",
            dashboardUrl: "https://<env>.saleor.cloud/dashboard/",
            cloudSso: "Google",
          },
        },
        null,
        2
      )}`
    );
  }
  const config = readJson<SharedConfig>(SHARED_CONFIG);
  const kind = (override ?? config.target) as Target["kind"];
  const url = kind === "local" ? config.local?.saleorApiUrl : config.cloud?.saleorApiUrl;
  if (!url) die(`${SHARED_CONFIG} has no ${kind}.saleorApiUrl.`);
  const dashboardUrl =
    kind === "cloud"
      ? (config.cloud?.dashboardUrl ?? url.replace(/graphql\/$/, "dashboard/"))
      : url.replace(/graphql\/$/, "dashboard/");
  return { kind, saleorApiUrl: url, dashboardUrl, host: new URL(url).host };
}

type Credential = { token: string; appId: string; createdAt: string };

function credential(target: Target): Credential | undefined {
  return readJson<Record<string, Credential>>(CREDENTIALS, {})[target.host];
}

function requireCredential(target: Target): Credential {
  const cred = credential(target);
  if (!cred)
    die(
      `No configurator app token for ${target.host}. Run \`verify-configurator login\` (the user signs in once).`,
      2
    );
  return cred;
}

// ---------------------------------------------------------------------------------------------
// GraphQL. `gql` seeds and reads side effects; it never stands in for a CLI step (V9).

async function rawGql(
  url: string,
  token: string | undefined,
  query: string,
  variables: Record<string, unknown> = {}
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json()) as {
    data?: Record<string, unknown>;
    errors?: { message: string }[];
  };
  if (body.errors?.length)
    throw new Error(`GraphQL error: ${body.errors.map((e) => e.message).join("; ")}`);
  for (const [field, payload] of Object.entries(body.data ?? {})) {
    const errors = (
      payload as { errors?: { message: string; field?: string; code?: string }[] } | null
    )?.errors;
    if (errors?.length)
      throw new Error(
        `${field}: ${errors.map((e) => `${e.field ?? ""} ${e.code ?? ""} ${e.message}`).join("; ")}`
      );
  }
  return body.data ?? {};
}

const appGql = (target: Target, query: string, variables: Record<string, unknown> = {}) =>
  rawGql(target.saleorApiUrl, requireCredential(target).token, query, variables);

async function tokenWorks(target: Target, token: string) {
  try {
    const data = (await rawGql(target.saleorApiUrl, token, "{ app { id name isActive } }")) as {
      app?: { id: string; isActive: boolean };
    };
    return Boolean(data.app?.isActive);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// Browser: Playwright driving its own Google Chrome profile, never the user's main browser (V2).

function playwright(): typeof import("playwright-core") {
  const pkg = path.join(RUNTIME_DIR, "package.json");
  if (!fs.existsSync(path.join(RUNTIME_DIR, "node_modules/playwright-core"))) {
    log(
      `installing playwright-core@${PLAYWRIGHT_VERSION} into ${RUNTIME_DIR} (once; drives system Google Chrome)`
    );
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    if (!fs.existsSync(pkg)) writeJson(pkg, { name: "verify-configurator-runtime", private: true });
    sh(
      "npm",
      ["install", "--silent", "--no-audit", "--no-fund", `playwright-core@${PLAYWRIGHT_VERSION}`],
      { cwd: RUNTIME_DIR }
    );
  }
  return createRequire(pkg)("playwright-core");
}

async function openBrowser(headless: boolean) {
  const { chromium } = playwright();
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const context = await chromium
    .launchPersistentContext(PROFILE_DIR, {
      channel: "chrome",
      headless,
      viewport: { width: 1280, height: 1000 },
      args: ["--disable-blink-features=AutomationControlled"],
    })
    .catch((error: Error) => {
      if (/ProcessSingleton|already in use|SingletonLock/i.test(error.message))
        die(
          `The helper's Chrome profile (${PROFILE_DIR}) is open in another window. Close it and retry.`
        );
      throw error;
    });
  // Chrome drops session cookies on close; Saleor Cloud's sign-in lives in them. Restore them.
  const saved = readJson<Parameters<typeof context.addCookies>[0]>(SESSION_COOKIES, []);
  const now = Date.now() / 1000;
  if (saved.length)
    await context
      .addCookies(
        saved.filter((c) => c.expires === undefined || c.expires === -1 || c.expires > now)
      )
      .catch(() => undefined);
  return {
    context,
    close: async () => {
      const cookies = await context.cookies().catch(() => []);
      const session = cookies.filter(
        (c) => c.expires === -1 && SESSION_COOKIE_DOMAINS.test(c.domain)
      );
      if (session.length) writeJson(SESSION_COOKIES, session, 0o600);
      await context.close();
    },
  };
}

function isStaffToken(value: string | undefined): value is string {
  if (!value?.startsWith("eyJ")) return false;
  try {
    const claims = JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8")) as {
      email?: string;
      app?: string;
    };
    return Boolean(claims.email) && !claims.app;
  } catch {
    return false;
  }
}

/** Loads the Dashboard and takes the staff bearer token from its own GraphQL requests. */
async function captureDashboardToken(
  page: import("playwright-core").Page,
  target: Target,
  timeoutMs = 45_000
) {
  let token: string | undefined;
  const listener = (request: import("playwright-core").Request) => {
    const headers = request.headers();
    const value =
      headers["authorization-bearer"] ?? headers.authorization?.replace(/^Bearer\s+/i, "");
    let topFrame = false;
    try {
      topFrame = request.frame().parentFrame() === null;
    } catch {
      topFrame = false;
    }
    if (topFrame && request.url().startsWith(target.saleorApiUrl) && isStaffToken(value))
      token = value;
  };
  page.on("request", listener);
  if (!page.url().startsWith(target.dashboardUrl))
    await page.goto(target.dashboardUrl, { waitUntil: "domcontentloaded" });
  else await page.reload({ waitUntil: "domcontentloaded" });
  try {
    return await poll("a Dashboard GraphQL request with a staff token", () => token, {
      timeoutMs,
      intervalMs: 500,
    });
  } catch {
    return undefined;
  } finally {
    page.off("request", listener);
  }
}

/** Creates the sandbox app the CLI authenticates as, with every permission the staff user can grant. */
async function createAppToken(target: Target, staffToken: string): Promise<Credential> {
  const shop = (await rawGql(
    target.saleorApiUrl,
    staffToken,
    "{ shop { permissions { code } } }"
  )) as { shop: { permissions: { code: string }[] } };
  const permissions = shop.shop.permissions.map((p) => p.code);
  const created = (await rawGql(
    target.saleorApiUrl,
    staffToken,
    `mutation($input: AppInput!) { appCreate(input: $input) { authToken app { id } errors { field code message } } }`,
    { input: { name: APP_NAME, permissions } }
  )) as { appCreate: { authToken: string; app: { id: string } } };
  return {
    token: created.appCreate.authToken,
    appId: created.appCreate.app.id,
    createdAt: new Date().toISOString(),
  };
}

async function cmdLogin(check: boolean) {
  const target = resolveTarget();
  const existing = credential(target);
  if (existing && (await tokenWorks(target, existing.token))) {
    log(`app token for ${target.host} works (app ${existing.appId})`);
    return;
  }
  if (check)
    die(
      `No working app token for ${target.host}. Ask the user to run \`verify-configurator login\` and sign in, then continue.`,
      2
    );
  if (target.kind !== "cloud")
    die(
      `Local target: create an app token on ${target.host} and write it to ${CREDENTIALS} as {"${target.host}": {"token": "...", "appId": "...", "createdAt": "..."}}.`
    );
  const { context, close } = await openBrowser(false);
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    log(
      `sign in to ${target.dashboardUrl} in the helper's Chrome window (waiting up to 15 minutes)`
    );
    await page.goto(target.dashboardUrl, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: /continue with saleor cloud/i })
      .click({ timeout: 30_000 })
      .catch(() => undefined);
    const staff = await poll(
      "the user to sign in",
      async () =>
        page.url().startsWith(target.dashboardUrl)
          ? captureDashboardToken(page, target, 10_000)
          : undefined,
      { timeoutMs: 15 * 60_000, intervalMs: 5_000 }
    ).catch(() => undefined);
    if (!staff) die("Sign-in did not finish within 15 minutes.");
    const cred = await createAppToken(target, staff);
    const all = readJson<Record<string, Credential>>(CREDENTIALS, {});
    writeJson(CREDENTIALS, { ...all, [target.host]: cred }, 0o600);
    log(`created sandbox app "${APP_NAME}" (${cred.appId}); its token is in ${CREDENTIALS}`);
  } finally {
    await close();
  }
}

// ---------------------------------------------------------------------------------------------
// Run state and the store lock (V3).

type Served = {
  kind: "checkout" | "release" | "ref";
  label: string;
  cli: string;
  dir: string;
  sha?: string;
};
type RunState = {
  runId: string;
  prefix: string;
  runDir: string;
  worktree: string;
  target: Target;
  startedAt: string;
  checkoutSha: string;
  served: Served;
  checkout: Served;
  from?: Served;
  identity?: Record<string, unknown>;
  seedChannel?: string;
};
type Lock = {
  runDir: string;
  runId: string;
  pid: number;
  worktree: string;
  heartbeat: string;
  owner: string;
};

const lockFile = (target: Target) => path.join(LOCK_DIR, `${target.host}--store.json`);

function liveLocksOnHost(target: Target): { file: string; lock: Lock }[] {
  if (!fs.existsSync(LOCK_DIR)) return [];
  return fs
    .readdirSync(LOCK_DIR)
    .filter((f) => f.startsWith(`${target.host}--`) && f.endsWith(".json"))
    .map((f) => ({ file: path.join(LOCK_DIR, f), lock: readJson<Lock>(path.join(LOCK_DIR, f)) }))
    .filter(({ lock }) => Date.now() - Date.parse(lock.heartbeat) < HEARTBEAT_TTL_MS);
}

function currentState(): RunState {
  const pointer = path.join(RUN_ROOT, "current.json");
  if (!fs.existsSync(pointer)) die("No run is active. Start one with `verify-configurator up`.");
  const { runDir } = readJson<{ runDir: string }>(pointer);
  if (!fs.existsSync(path.join(runDir, "state.json")))
    die("No run is active. Start one with `verify-configurator up`.");
  const state = readJson<RunState>(path.join(runDir, "state.json"));
  if (state.worktree !== REPO)
    die(`The active run belongs to ${state.worktree} (run ${state.runId}).`);
  heartbeat(state);
  return state;
}

const saveState = (state: RunState) =>
  writeJson(path.join(state.runDir, "state.json"), state, 0o600);

function heartbeat(state: RunState) {
  writeJson(lockFile(state.target), {
    runDir: state.runDir,
    runId: state.runId,
    pid: process.pid,
    worktree: state.worktree,
    heartbeat: new Date().toISOString(),
    owner: "verify-configurator",
  } satisfies Lock);
}

// ---------------------------------------------------------------------------------------------
// Redaction (V19).

function redactText(text: string, target?: Target): string {
  let out = text
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "•••redacted•••")
    .replace(/(--token[= ])\S+/g, "$1•••")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{16,}/g, "Bearer •••");
  const token = target ? credential(target)?.token : undefined;
  if (token) out = out.split(token).join("•••redacted•••");
  return out;
}

// ---------------------------------------------------------------------------------------------
// Evidence (V16) and scenarios (V18).

type EvidenceEntry = {
  file: string;
  feature?: string;
  command?: string;
  served: string;
  target: string;
  revision: string;
  at: string;
};
type Scenario = {
  id: string;
  outcome: "passed" | "failed" | "blocked";
  class: string;
  feature: string;
  note?: string;
  evidence: string[];
  served: string;
  target: string;
  revision: string;
  at: string;
};

const evidenceDir = (state: RunState) => path.join(state.runDir, "evidence");

function recordEvidence(
  state: RunState,
  name: string,
  content: string | Buffer,
  meta: Partial<EvidenceEntry> = {}
) {
  const dir = evidenceDir(state);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(name);
  const file = path.join(dir, `${path.basename(name, ext)}-${timestamp()}-${shortSha()}${ext}`);
  fs.writeFileSync(file, typeof content === "string" ? redactText(content, state.target) : content);
  const index = readJson<EvidenceEntry[]>(path.join(dir, "index.json"), []);
  index.push({
    file,
    served: state.served.label,
    target: `${state.target.kind}:${state.target.host}`,
    revision: state.checkoutSha,
    at: new Date().toISOString(),
    ...meta,
  });
  writeJson(path.join(dir, "index.json"), index);
  return file;
}

function updateScenario(
  state: RunState,
  scenario: Omit<Scenario, "served" | "target" | "revision" | "at">
) {
  const file = path.join(state.runDir, "scenarios.json");
  const all = readJson<Scenario[]>(file, []).filter((s) => s.id !== scenario.id);
  all.push({
    ...scenario,
    served: state.served.label,
    target: `${state.target.kind}:${state.target.host}`,
    revision: state.checkoutSha,
    at: new Date().toISOString(),
  });
  writeJson(file, all);
}

// ---------------------------------------------------------------------------------------------
// Serving the CLI: the checkout's built bin/cli.mjs (V4), a published release, or a git ref.

function buildCheckout(dir: string) {
  log(`building ${dir === REPO ? "the checkout" : dir} (pnpm build)`);
  sh("pnpm", ["build"], { cwd: dir, timeoutMs: 10 * 60_000 });
  return { cli: path.join(dir, "bin/cli.mjs"), sha: git(["rev-parse", "HEAD"], dir) };
}

function newestRelease() {
  return sh("npm", ["view", PACKAGE, "version"]).out;
}

function serveFrom(state: RunState, ref: string): Served {
  // `latest`, `npm:<version>`, or a bare semver → a published release; anything else → a git ref.
  const release =
    ref === "latest"
      ? newestRelease()
      : ref.startsWith("npm:")
        ? ref.slice(4)
        : /^\d+\.\d+\.\d+/.test(ref)
          ? ref
          : undefined;
  if (release) {
    const dir = path.join(state.runDir, `release-${release}`);
    log(`installing ${PACKAGE}@${release} into ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
    writeJson(path.join(dir, "package.json"), {
      name: "verify-configurator-release",
      private: true,
    });
    sh("npm", ["install", "--silent", "--no-audit", "--no-fund", `${PACKAGE}@${release}`], {
      cwd: dir,
      timeoutMs: 5 * 60_000,
    });
    return {
      kind: "release",
      label: `release ${release}`,
      cli: path.join(dir, "node_modules", PACKAGE, "bin/cli.mjs"),
      dir,
    };
  }
  const sha = git(["rev-parse", "--verify", `${ref}^{commit}`]);
  const dir = path.join(state.runDir, `ref-${sha.slice(0, 9)}`);
  log(`checking out ${ref} (${sha.slice(0, 9)}) into ${dir}`);
  sh("git", ["-C", REPO, "worktree", "add", "--detach", dir, sha]);
  sh("pnpm", ["install", "--frozen-lockfile", "--silent"], { cwd: dir, timeoutMs: 10 * 60_000 });
  const built = buildCheckout(dir);
  return { kind: "ref", label: `ref ${ref} (${sha.slice(0, 9)})`, cli: built.cli, dir, sha };
}

/** Runs the served CLI as a user would, with --url/--token injected for remote commands. */
function runCli(
  state: RunState,
  args: string[],
  served = state.served,
  opts: { timeoutMs?: number } = {}
) {
  for (const arg of args) {
    if (/^--url/.test(arg))
      die(
        "Don't pass --url; the helper injects the sandbox URL. It never deploys anywhere else (V2)."
      );
    if (/^--token/.test(arg)) die("Don't pass --token; the helper injects the sandbox app token.");
  }
  const remote = isRemote(args);
  const full = remote
    ? [
        ...args,
        `--url=${state.target.saleorApiUrl}`,
        `--token=${requireCredential(state.target).token}`,
      ]
    : args;
  const work = path.join(state.runDir, "work");
  fs.mkdirSync(work, { recursive: true });
  const started = Date.now();
  const result = sh("node", [served.cli, ...full], {
    cwd: work,
    allowFail: true,
    env: { ...process.env, CI: "true", FORCE_COLOR: "0", NO_COLOR: "1" },
    timeoutMs: opts.timeoutMs ?? 30 * 60_000,
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const transcript = `$ configurator ${redactText(full.join(" "), state.target)}\n# served: ${served.label} · exit ${result.status} · ${seconds}s · cwd ${work}\n\n${result.out}\n${result.err ? `\n--- stderr ---\n${result.err}\n` : ""}`;
  const file = recordEvidence(state, `cli-${args[0] ?? "help"}.txt`, transcript, {
    command: args.join(" "),
  });
  return { ...result, file, transcript: redactText(transcript, state.target) };
}

/** In CI mode the CLI prints one JSON envelope: { command, version, exitCode, result, logs }. */
function cliResult(
  stdout: string
): { status?: string; summary?: { totalChanges?: number } } | undefined {
  try {
    return (
      JSON.parse(stdout) as { result?: { status?: string; summary?: { totalChanges?: number } } }
    ).result;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------------------------
// Seed data: one small store slice, every object named with the run prefix (V19).

function seedConfig(prefix: string) {
  const p = prefix;
  return `# verify-configurator seed for run ${p}. Every object carries the run prefix; \`down\` removes them.
channels:
  - name: "${p} Channel"
    slug: ${p}-channel
    currencyCode: USD
    defaultCountry: US
    isActive: false
warehouses:
  - name: "${p} Warehouse"
    slug: ${p}-warehouse
    email: warehouse@example.com
    isPrivate: true
    clickAndCollectOption: DISABLED
    address:
      streetAddress1: "1 Test Street"
      city: NEW YORK
      postalCode: "10001"
      country: US
      countryArea: NY
productAttributes:
  - name: "${p} Color"
    inputType: DROPDOWN
    values:
      - name: "${p} Red"
      - name: "${p} Blue"
productTypes:
  - name: "${p} Shirt"
    isShippingRequired: true
    productAttributes:
      - attribute: "${p} Color"
categories:
  - name: "${p} Apparel"
    slug: ${p}-apparel
    subcategories:
      - name: "${p} Shirts"
        slug: ${p}-shirts
products:
  - name: "${p} Tee"
    slug: ${p}-tee
    description: "Seeded tee"
    productType: "${p} Shirt"
    category: ${p}-shirts
    attributes:
      "${p} Color": "${p} Red"
    media:
      - externalUrl: "https://placehold.co/600x600.png"
        alt: "${p} tee"
    channelListings:
      - channel: ${p}-channel
        isPublished: true
        visibleInListings: true
        isAvailableForPurchase: true
    variants:
      - name: "${p} Tee M"
        sku: ${p.toUpperCase()}-TEE-M
        attributes: {}
        channelListings:
          - channel: ${p}-channel
            price: 19.99
collections:
  - name: "${p} Featured"
    slug: ${p}-featured
    products:
      - ${p}-tee
    channelListings:
      - channelSlug: ${p}-channel
        isPublished: true
`;
}

// ---------------------------------------------------------------------------------------------
// Cleanup: the configurator can't delete, so `down` removes run-prefixed objects through GraphQL.

type Deleter = {
  label: string;
  list: string;
  field: string;
  filter: (prefix: string) => Record<string, unknown>;
  del: string;
  match: (node: Record<string, string>, prefix: string) => boolean;
};

const startsWith = (key: string) => (node: Record<string, string>, prefix: string) =>
  (node[key] ?? "").toLowerCase().startsWith(prefix.toLowerCase());

const DELETERS: Deleter[] = [
  {
    label: "collections",
    list: "collections(first: 100, filter: $filter) { edges { node { id name slug } } }",
    field: "collections",
    filter: (p) => ({ search: p }),
    del: "mutation($id: ID!) { collectionDelete(id: $id) { errors { message } } }",
    match: startsWith("slug"),
  },
  {
    label: "products",
    list: "products(first: 100, filter: $filter) { edges { node { id name slug } } }",
    field: "products",
    filter: (p) => ({ search: p }),
    del: "mutation($id: ID!) { productDelete(id: $id) { errors { message } } }",
    match: startsWith("slug"),
  },
  {
    label: "categories",
    list: "categories(first: 100, filter: $filter) { edges { node { id name slug } } }",
    field: "categories",
    filter: (p) => ({ search: p }),
    del: "mutation($id: ID!) { categoryDelete(id: $id) { errors { message } } }",
    match: startsWith("slug"),
  },
  {
    label: "product types",
    list: "productTypes(first: 100, filter: $filter) { edges { node { id name slug } } }",
    field: "productTypes",
    filter: (p) => ({ search: p }),
    del: "mutation($id: ID!) { productTypeDelete(id: $id) { errors { message } } }",
    match: startsWith("name"),
  },
  {
    label: "page types",
    list: "pageTypes(first: 100, filter: $filter) { edges { node { id name slug } } }",
    field: "pageTypes",
    filter: (p) => ({ search: p }),
    del: "mutation($id: ID!) { pageTypeDelete(id: $id) { errors { message } } }",
    match: startsWith("name"),
  },
  {
    label: "attributes",
    list: "attributes(first: 100, filter: $filter) { edges { node { id name slug } } }",
    field: "attributes",
    filter: (p) => ({ search: p }),
    del: "mutation($id: ID!) { attributeDelete(id: $id) { errors { message } } }",
    match: startsWith("name"),
  },
  {
    label: "warehouses",
    list: "warehouses(first: 100, filter: $filter) { edges { node { id name slug } } }",
    field: "warehouses",
    filter: (p) => ({ search: p }),
    del: "mutation($id: ID!) { deleteWarehouse(id: $id) { errors { message } } }",
    match: startsWith("slug"),
  },
  {
    label: "shipping zones",
    list: "shippingZones(first: 100, filter: $filter) { edges { node { id name } } }",
    field: "shippingZones",
    filter: (p) => ({ search: p }),
    del: "mutation($id: ID!) { shippingZoneDelete(id: $id) { errors { message } } }",
    match: startsWith("name"),
  },
  {
    label: "tax classes",
    list: "taxClasses(first: 100, filter: $filter) { edges { node { id name } } }",
    field: "taxClasses",
    filter: () => ({}),
    del: "mutation($id: ID!) { taxClassDelete(id: $id) { errors { message } } }",
    match: startsWith("name"),
  },
  {
    label: "menus",
    list: "menus(first: 100, filter: $filter) { edges { node { id name slug } } }",
    field: "menus",
    filter: (p) => ({ search: p }),
    del: "mutation($id: ID!) { menuDelete(id: $id) { errors { message } } }",
    match: startsWith("slug"),
  },
];

const FILTER_TYPES: Record<string, string> = {
  collections: "CollectionFilterInput",
  products: "ProductFilterInput",
  categories: "CategoryFilterInput",
  productTypes: "ProductTypeFilterInput",
  pageTypes: "PageTypeFilterInput",
  attributes: "AttributeFilterInput",
  warehouses: "WarehouseFilterInput",
  shippingZones: "ShippingZoneFilterInput",
  taxClasses: "TaxClassFilterInput",
  menus: "MenuFilterInput",
};

async function findPrefixed(target: Target, prefix: string) {
  const found: { label: string; del: string; id: string; name: string }[] = [];
  for (const d of DELETERS) {
    const data = (await appGql(target, `query($filter: ${FILTER_TYPES[d.field]}) { ${d.list} }`, {
      filter: d.filter(prefix),
    })) as Record<string, { edges: { node: Record<string, string> }[] }>;
    for (const { node } of data[d.field]?.edges ?? [])
      if (d.match(node, prefix))
        found.push({ label: d.label, del: d.del, id: node.id, name: node.slug ?? node.name });
  }
  // Product search indexes asynchronously, so also find products through the run's product types.
  const typeIds = found.filter((f) => f.label === "product types").map((f) => f.id);
  if (typeIds.length) {
    const byType = (await appGql(
      target,
      "query($types: [ID!]) { products(first: 100, filter: { productTypes: $types }) { edges { node { id slug } } } }",
      { types: typeIds }
    )) as { products: { edges: { node: { id: string; slug: string } }[] } };
    const known = new Set(found.map((f) => f.id));
    const extra = byType.products.edges
      .map(({ node }) => node)
      .filter((node) => !known.has(node.id))
      .map((node) => ({
        label: "products",
        del: "mutation($id: ID!) { productDelete(id: $id) { errors { message } } }",
        id: node.id,
        name: node.slug,
      }));
    found.unshift(...extra);
  }
  const channels = (await appGql(target, "{ channels { id slug } }")) as {
    channels: { id: string; slug: string }[];
  };
  for (const c of channels.channels)
    if (c.slug.startsWith(prefix))
      found.push({
        label: "channels",
        del: "mutation($id: ID!) { channelDelete(id: $id) { errors { message } } }",
        id: c.id,
        name: c.slug,
      });
  return found;
}

const singular = (label: string) => label.replace(/ies$/, "y").replace(/s$/, "");

async function sweepPrefix(target: Target, prefix: string) {
  const found = await findPrefixed(target, prefix);
  for (const item of found) {
    try {
      await appGql(target, item.del, { id: item.id });
      log(`deleted ${singular(item.label)} ${item.name}`);
    } catch (error) {
      // Saleor deletes subcategories with their parent; a node that no longer resolves is already gone.
      if (/Couldn't resolve to a node/.test((error as Error).message)) continue;
      log(`could not delete ${singular(item.label)} ${item.name}: ${(error as Error).message}`);
    }
  }
  return found.length;
}

// ---------------------------------------------------------------------------------------------
// Commands.

async function recordIdentity(state: RunState) {
  const data = (await appGql(
    state.target,
    "{ app { name permissions { code } } shop { version } }"
  )) as { app: { name: string; permissions: { code: string }[] }; shop: { version: string } };
  const pkg = readJson<{ saleor?: { schemaVersion?: string }; version: string }>(
    path.join(REPO, "package.json")
  );
  state.identity = {
    app: data.app.name,
    permissionCount: data.app.permissions.length,
    saleorVersion: data.shop.version,
    targetedSchema: pkg.saleor?.schemaVersion ?? "unknown",
    checkoutVersion: pkg.version,
  };
  writeJson(path.join(state.runDir, "identity.json"), state.identity);
}

async function cmdUp(flags: Record<string, string | true>) {
  const target = resolveTarget(typeof flags.target === "string" ? flags.target : undefined);
  const live = liveLocksOnHost(target).filter(
    ({ lock }) =>
      !(
        lock.owner === "verify-configurator" && !fs.existsSync(path.join(lock.runDir, "state.json"))
      )
  );
  if (live.length) {
    const own = live.find(
      ({ lock }) => lock.owner === "verify-configurator" && lock.worktree === REPO
    );
    if (own)
      die(
        `Run ${own.lock.runId} from this checkout is still active. Use it, or run \`verify-configurator down\` first.`
      );
    die(
      `${target.host} is in use: ${live.map(({ file, lock }) => `${path.basename(file)} (run ${lock.runId}, ${lock.worktree})`).join("; ")}. Deploys change the whole store, so wait for it to finish.`
    );
  }
  await cmdLogin(true);

  // Reclaim leftovers from dead runs of this helper (V19).
  if (fs.existsSync(RUN_ROOT)) {
    for (const dir of fs.readdirSync(RUN_ROOT)) {
      const statePath = path.join(RUN_ROOT, dir, "state.json");
      if (!fs.existsSync(statePath)) continue;
      const old = readJson<RunState>(statePath);
      if (old.target.host !== target.host) continue;
      log(`sweeping leftovers of dead run ${old.runId}`);
      await sweepPrefix(target, old.prefix);
      cleanupServed(old);
      fs.rmSync(statePath);
    }
  }

  const runId = randomBytes(3).toString("hex");
  const prefix = `vc-${runId}`;
  const runDir = path.join(RUN_ROOT, runId);
  fs.mkdirSync(path.join(runDir, "work"), { recursive: true });
  const built = buildCheckout(REPO);
  const checkout: Served = {
    kind: "checkout",
    label: `checkout ${built.sha.slice(0, 9)}`,
    cli: built.cli,
    dir: REPO,
    sha: built.sha,
  };
  const state: RunState = {
    runId,
    prefix,
    runDir,
    worktree: REPO,
    target,
    startedAt: new Date().toISOString(),
    checkoutSha: built.sha.slice(0, 9),
    served: checkout,
    checkout,
  };
  heartbeat(state);
  writeJson(path.join(RUN_ROOT, "current.json"), { runDir });
  saveState(state);

  if (flags.from) {
    state.from = serveFrom(state, flags.from === true ? "latest" : flags.from);
    state.served = state.from;
    saveState(state);
  }
  await recordIdentity(state);
  saveState(state);
  log(
    `run ${runId} on ${target.kind}:${target.host}, serving ${state.served.label}, prefix ${prefix}`
  );

  // Seed through the served CLI, as a user would.
  const seedFile = path.join(runDir, "work", "seed.yml");
  fs.writeFileSync(seedFile, seedConfig(prefix));
  const seeded = runCli(state, ["deploy", "--config=seed.yml"]);
  if (!seeded.ok)
    die(
      `Seeding failed (harness blocked, V17). Transcript: ${seeded.file}\n${seeded.transcript.slice(-3000)}`
    );
  state.seedChannel = `${prefix}-channel`;
  saveState(state);
  log(`seeded store slice with prefix ${prefix} (transcript ${seeded.file})`);
  log("next: `verify-configurator doctor`");
}

function cleanupServed(state: RunState) {
  for (const served of [state.from]) {
    if (served?.kind === "ref")
      sh("git", ["-C", REPO, "worktree", "remove", "--force", served.dir], { allowFail: true });
  }
}

async function cmdUpgrade() {
  const state = currentState();
  if (state.served.kind === "checkout")
    die("The run already serves the checkout. Start with `up --from` for an upgrade check.");
  const from = state.served;
  const include = `--include=${SEED_SECTIONS}`;
  log(`1/5 ${from.label} introspects the seeded store`);
  const before = runCli(state, ["introspect", include, "--config=upgrade-release.yml"]);
  const results: { id: string; ok: boolean; file: string; note: string }[] = [
    {
      id: "upgrade-release-introspect",
      ok: before.ok,
      file: before.file,
      note: `${from.label} introspect`,
    },
  ];
  state.served = state.checkout;
  saveState(state);
  log(`2/5 checkout validates the file ${from.label} wrote`);
  const validate = runCli(state, ["validate", "--config=upgrade-release.yml"]);
  results.push({
    id: "upgrade-validate",
    ok: validate.ok,
    file: validate.file,
    note: "checkout parses the old release's config.yml",
  });
  log("3/5 checkout diffs it against the store");
  const diff = runCli(state, ["diff", include, "--config=upgrade-release.yml"]);
  const noDiff = diff.ok && cliResult(diff.out)?.summary?.totalChanges === 0;
  results.push({
    id: "upgrade-diff-clean",
    ok: noDiff,
    file: diff.file,
    note: "checkout sees no difference between the old release's file and the store",
  });
  if (noDiff) {
    log("4/5 checkout deploys it (expects no changes)");
    const deploy = runCli(state, ["deploy", include, "--config=upgrade-release.yml"]);
    const noChange = deploy.ok && cliResult(deploy.out)?.status === "no-changes";
    results.push({
      id: "upgrade-deploy-idempotent",
      ok: noChange,
      file: deploy.file,
      note: "checkout deploy of the old release's file changes nothing",
    });
  } else {
    // The file covers every object in these sections on the shared sandbox; never write a failed compatibility check onto them.
    log("4/5 skipped: the diff isn't clean, so the deploy would write onto everyone's objects");
    results.push({
      id: "upgrade-deploy-idempotent",
      ok: false,
      file: diff.file,
      note: "not run: the diff wasn't clean (see upgrade-diff-clean)",
    });
  }
  log("5/5 checkout introspects the same sections; shapes are compared");
  const after = runCli(state, ["introspect", include, "--config=upgrade-checkout.yml"]);
  const shapeDiff = sh(
    "diff",
    [
      "-u",
      path.join(state.runDir, "work/upgrade-release.yml"),
      path.join(state.runDir, "work/upgrade-checkout.yml"),
    ],
    { allowFail: true }
  );
  const shapeFile = recordEvidence(state, "upgrade-shape.diff", shapeDiff.out || "(identical)\n", {
    feature: "upgrade",
  });
  results.push({
    id: "upgrade-introspect-shape",
    ok: after.ok,
    file: shapeFile,
    note: shapeDiff.out
      ? "introspected files differ; read the diff and judge each change"
      : "introspected files identical",
  });
  for (const r of results) {
    updateScenario(state, {
      id: r.id,
      outcome: r.ok ? "passed" : "failed",
      class: "sandbox-live",
      feature: "upgrade",
      note: r.note,
      evidence: [r.file],
    });
    log(`${r.ok ? "passed" : "FAILED"}  ${r.id}  ${r.file}`);
  }
  log("Now drive every feature on this saved data before creating new data (V6).");
}

function newestSourceChange() {
  return (
    Number(sh("git", ["-C", REPO, "log", "-1", "--format=%ct", "--", "src", "package.json"]).out) *
    1000
  );
}

function uncommittedSource() {
  return sh("git", ["-C", REPO, "status", "--porcelain", "--", "src", "package.json"]).out;
}

async function cmdDoctor() {
  const state = currentState();
  const lines: string[] = [];
  const ok = (m: string) => lines.push(`ok    ${m}`);
  const warn = (m: string) => lines.push(`warn  ${m}`);
  const info = (m: string) => lines.push(`info  ${m}`);
  const fail = (m: string) => lines.push(`FAIL  ${m}`);

  const cred = requireCredential(state.target);
  (await tokenWorks(state.target, cred.token))
    ? ok(`app token works on ${state.target.host}`)
    : fail("app token rejected; run `verify-configurator login`");
  info(
    `target ${state.target.kind}:${state.target.host}${state.target.kind === "local" ? " (Cloud-only paths are blocked on local)" : ""}`
  );
  info(`identity ${JSON.stringify(state.identity)}`);
  const head = git(["rev-parse", "HEAD"]);
  head === state.checkout.sha
    ? ok(`checkout build matches HEAD ${head.slice(0, 9)}`)
    : fail(
        `HEAD moved to ${head.slice(0, 9)} after the build (${state.checkoutSha}); rerun \`up\``
      );
  const dirty = uncommittedSource();
  if (dirty)
    warn(
      `uncommitted source changes; the build includes them only if made before \`up\`:\n${dirty}`
    );
  const distAge = fs.statSync(path.join(REPO, "dist/main.js")).mtimeMs;
  const srcFiles = sh("git", ["-C", REPO, "ls-files", "-m", "-o", "--exclude-standard", "src"])
    .out.split("\n")
    .filter(Boolean);
  const newer = srcFiles.filter(
    (f) => fs.existsSync(path.join(REPO, f)) && fs.statSync(path.join(REPO, f)).mtimeMs > distAge
  );
  newer.length
    ? fail(`source changed after the build: ${newer.join(", ")}; rerun \`up\``)
    : ok("dist is newer than every source change");
  const version = runCli(state, ["--version"]);
  ok(`served: ${state.served.label} → ${version.out.split("\n").pop()}`);
  const others = liveLocksOnHost(state.target).filter(({ lock }) => lock.runId !== state.runId);
  others.length
    ? fail(`other live runs on this host: ${others.map((o) => path.basename(o.file)).join(", ")}`)
    : ok("no other verify run holds this host");
  const leftovers = (await findPrefixed(state.target, "vc-")).filter(
    (f) => !f.name.toLowerCase().startsWith(state.prefix)
  );
  leftovers.length
    ? warn(
        `objects from other runs: ${leftovers.map((l) => `${l.label}:${l.name}`).join(", ")} (the next \`up\` sweeps dead runs)`
      )
    : ok("no leftovers from other runs");
  const base = sh("git", ["-C", REPO, "merge-base", "HEAD", "origin/main"], {
    allowFail: true,
  }).out;
  const touched = base
    ? sh("git", ["-C", REPO, "diff", "--name-only", base, "--", ...STORAGE_PATHS], {
        allowFail: true,
      }).out
    : "";
  const dirtyStorage = sh("git", ["-C", REPO, "status", "--porcelain", "--", ...STORAGE_PATHS]).out;
  if (touched || dirtyStorage)
    warn(
      `upgrade check required (V6): the change touches ${[touched, dirtyStorage].filter(Boolean).join("\n")}`
    );
  else info("upgrade check not required by the diff");
  console.log(lines.join("\n"));
  if (lines.some((l) => l.startsWith("FAIL"))) process.exit(1);
}

async function cmdCli(argv: string[]) {
  const state = currentState();
  const { flags, positional } = parseFlags(argv.slice(0, Math.max(argv.indexOf("--"), 0)));
  const args = argv.includes("--") ? argv.slice(argv.indexOf("--") + 1) : argv;
  const served =
    flags.as === "checkout"
      ? state.checkout
      : flags.as === "release"
        ? (state.from ?? die("No release is served in this run."))
        : state.served;
  void positional;
  const result = runCli(state, args, served);
  console.log(result.transcript);
  log(`transcript: ${result.file}`);
  process.exit(result.status);
}

async function cmdGql(argv: string[]) {
  const state = currentState();
  const { flags, positional } = parseFlags(argv);
  const query =
    positional[0] ??
    die("usage: verify-configurator gql '<query>' [--vars '<json>'] [--feature <id>]");
  const vars = typeof flags.vars === "string" ? JSON.parse(flags.vars) : {};
  const data = await appGql(state.target, query, vars);
  const text = JSON.stringify(data, null, 2);
  const file = recordEvidence(
    state,
    "gql-read.json",
    `// ${query.replace(/\s+/g, " ")}\n// vars ${JSON.stringify(vars)}\n${text}\n`,
    { feature: typeof flags.feature === "string" ? flags.feature : undefined }
  );
  console.log(text);
  log(`read saved: ${file}`);
}

/** vhs strings take no escapes: pick a quote the value doesn't contain. */
function vhsString(value: string) {
  const quote = ['"', "'", "`"].find((q) => !value.includes(q));
  if (!quote) die(`Can't quote for vhs: ${value}`);
  return `${quote}${value}${quote}`;
}

async function cmdRecord(argv: string[]) {
  const state = currentState();
  const { flags } = parseFlags(argv.slice(0, Math.max(argv.indexOf("--"), 0)));
  const name = typeof flags.name === "string" ? flags.name : "terminal";
  const args = argv.includes("--") ? argv.slice(argv.indexOf("--") + 1) : [];
  if (sh("which", ["vhs"], { allowFail: true }).status !== 0)
    die("vhs is not installed (brew install vhs). Interactive scenarios are blocked without it.");
  const shim = path.join(state.runDir, "shim");
  fs.mkdirSync(shim, { recursive: true });
  fs.writeFileSync(
    path.join(shim, "configurator"),
    `#!/usr/bin/env bash\nexec node ${vhsString(state.served.cli)} "$@"\n`,
    { mode: 0o755 }
  );
  const remote = isRemote(args);
  const typed = args.length
    ? `configurator ${args.join(" ")}${remote ? " --url $SALEOR_URL --token $SALEOR_TOKEN" : ""}`
    : "";
  const keys = typeof flags.keys === "string" ? flags.keys.split(",").map((k) => k.trim()) : [];
  const tapeBody = typeof flags.tape === "string" ? fs.readFileSync(flags.tape, "utf8") : "";
  const stamp = `${timestamp()}-${shortSha()}`;
  const out = path.join(evidenceDir(state), `${name}-${stamp}`);
  fs.mkdirSync(evidenceDir(state), { recursive: true });
  const keyLines = keys.map((k) =>
    /^(Enter|Up|Down|Left|Right|Tab|Space|Escape|Backspace)(@\S+)?( \d+)?$/.test(k)
      ? `${k}\nSleep 1s`
      : /^Sleep /.test(k)
        ? k
        : k === "{token}"
          ? // Prompts don't expand env vars; type the token with recording hidden.
            `Hide\nType ${vhsString(requireCredential(state.target).token)}\nShow\nSleep 500ms`
          : `Type ${vhsString(k === "{url}" ? state.target.saleorApiUrl : k)}\nSleep 500ms`
  );
  const tape = [
    `Output ${vhsString(`${out}.gif`)}`,
    "Set Shell bash",
    "Set FontSize 16",
    "Set Width 1400",
    "Set Height 900",
    "Set TypingSpeed 20ms",
    `Env PATH ${vhsString(`${shim}:${process.env.PATH}`)}`,
    `Env SALEOR_URL ${vhsString(state.target.saleorApiUrl)}`,
    `Env SALEOR_TOKEN ${vhsString(requireCredential(state.target).token)}`,
    "Hide",
    `Type ${vhsString(`cd ${path.join(state.runDir, "work")} && clear`)}`,
    "Enter",
    "Show",
    typed
      ? `Type ${vhsString(typed)}\nEnter\nSleep ${typeof flags.wait === "string" ? flags.wait : "8s"}`
      : "",
    ...keyLines,
    tapeBody,
    "Sleep 2s",
  ]
    .filter(Boolean)
    .join("\n");
  const tapeFile = path.join(state.runDir, `${name}.tape`);
  fs.writeFileSync(tapeFile, tape, { mode: 0o600 });
  log(`recording ${name} with vhs`);
  const result = sh("vhs", [tapeFile], { allowFail: true, timeoutMs: 20 * 60_000 });
  fs.rmSync(tapeFile); // holds the token
  if (!result.ok) die(`vhs failed (harness blocked):\n${result.err.slice(-1500)}`);
  // vhs's Screenshot is unreliable; the last frame of the gif is what the user saw at the end.
  sh("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    `${out}.gif`,
    "-vf",
    "reverse",
    "-frames:v",
    "1",
    `${out}.png`,
  ]);
  for (const ext of [".gif", ".png"]) {
    const index = readJson<EvidenceEntry[]>(path.join(evidenceDir(state), "index.json"), []);
    index.push({
      file: `${out}${ext}`,
      command: typed,
      served: state.served.label,
      target: `${state.target.kind}:${state.target.host}`,
      revision: state.checkoutSha,
      at: new Date().toISOString(),
      feature: typeof flags.feature === "string" ? flags.feature : undefined,
    });
    writeJson(path.join(evidenceDir(state), "index.json"), index);
  }
  log(`recorded ${out}.gif and ${out}.png (the token shows only as $SALEOR_TOKEN)`);
}

async function cmdScenario(argv: string[]) {
  const state = currentState();
  const { flags, positional } = parseFlags(argv);
  const [id, outcome] = positional;
  if (!id || !["passed", "failed", "blocked"].includes(outcome ?? ""))
    die(
      "usage: verify-configurator scenario <id> <passed|failed|blocked> --feature <feature> [--class sandbox-live] [--note '...'] [--evidence a,b]"
    );
  const feature = typeof flags.feature === "string" ? flags.feature : id.split("-")[0];
  if (
    !FEATURES.includes(feature) &&
    !fs.existsSync(path.join(SKILL_DIR, "features", `${feature}.md`))
  )
    die(`Unknown feature ${feature}. Features: ${FEATURES.join(", ")}`);
  const evidence =
    typeof flags.evidence === "string" ? flags.evidence.split(",").filter(Boolean) : [];
  if (outcome === "passed" && !evidence.length)
    die("A passed scenario needs evidence, including the independent read (V10).");
  for (const file of evidence) if (!fs.existsSync(file)) die(`Evidence ${file} does not exist.`);
  if (outcome !== "passed" && !flags.note)
    die("A failed or blocked scenario needs --note with the reason.");
  updateScenario(state, {
    id,
    outcome: outcome as Scenario["outcome"],
    class: typeof flags.class === "string" ? flags.class : "sandbox-live",
    feature,
    note: typeof flags.note === "string" ? flags.note : undefined,
    evidence,
  });
  log(`${id}: ${outcome}`);
}

async function cmdReport() {
  const state = currentState();
  const scenarios = readJson<Scenario[]>(path.join(state.runDir, "scenarios.json"), []);
  const newest = newestSourceChange();
  const dirty = uncommittedSource();
  const rows = scenarios.map((s) => {
    const stale =
      s.evidence.some((f) => fs.existsSync(f) && fs.statSync(f).mtimeMs < newest) ||
      s.revision !== git(["rev-parse", "--short=9", "HEAD"]);
    return `${s.outcome.padEnd(8)} ${s.class.padEnd(13)} ${s.id.padEnd(34)} ${s.served}${stale ? "  STALE" : ""}\n         ${s.note ?? ""}\n${s.evidence.map((e) => `         ${e}`).join("\n")}`;
  });
  const exercised = new Set(scenarios.filter((s) => s.outcome === "passed").map((s) => s.feature));
  const missing = FEATURES.filter((f) => !exercised.has(f));
  const text = [
    `verify-configurator report · run ${state.runId} · ${state.target.kind}:${state.target.host} · checkout ${state.checkoutSha}${dirty ? " + uncommitted changes" : ""}`,
    `identity ${JSON.stringify(state.identity)}`,
    "",
    ...rows,
    "",
    `features with no passed scenario: ${missing.length ? missing.join(", ") : "none"}`,
  ].join("\n");
  const file = recordEvidence(state, "report.txt", text);
  console.log(text);
  log(`report: ${file}`);
  if (rows.some((r) => r.includes("STALE"))) process.exit(1);
}

async function cmdDown() {
  const state = currentState();
  log(`removing objects prefixed ${state.prefix}`);
  // Two passes: products before their types and categories; Saleor refuses some deletes while children exist.
  await sweepPrefix(state.target, state.prefix);
  const remaining = await findPrefixed(state.target, state.prefix);
  if (remaining.length) await sweepPrefix(state.target, state.prefix);
  const still = await findPrefixed(state.target, state.prefix);
  if (still.length)
    log(`left behind (remove by hand): ${still.map((s) => `${s.label}:${s.name}`).join(", ")}`);
  cleanupServed(state);
  fs.rmSync(path.join(state.runDir, "state.json"));
  fs.rmSync(lockFile(state.target), { force: true });
  fs.rmSync(path.join(RUN_ROOT, "current.json"), { force: true });
  log(`run ${state.runId} is down; evidence stays in ${evidenceDir(state)}`);
}

// ---------------------------------------------------------------------------------------------

const USAGE = `verify-configurator <command>

  login [--check]                 sign in once; creates the sandbox app whose token the CLI uses
  up [--from [<ref>]] [--target local]
                                  lock the host, build the checkout, seed a run-prefixed store slice.
                                  --from serves the newest npm release (or npm:<v>, <semver>, a git ref)
  doctor                          read-only health checks
  cli [--as checkout|release] -- <args>
                                  run the served CLI; --url/--token are injected
  upgrade                         old release's file → checkout validate, diff, deploy, introspect
  gql '<query>' [--vars json] [--feature id]
                                  independent read with the app token
  record --name <n> [--keys a,b] [--tape file] [--wait 8s] [--feature id] -- <args>
                                  record the CLI in a real terminal (vhs): gif + png
  scenario <id> <passed|failed|blocked> --feature <f> [--note] [--evidence a,b]
  report                          scenarios, evidence, stale checks, unexercised features
  down                            remove run-prefixed objects and release the lock; evidence stays`;

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { flags } = parseFlags(rest);
  switch (command) {
    case "login":
      return cmdLogin(Boolean(flags.check));
    case "up":
      return cmdUp(flags);
    case "doctor":
      return cmdDoctor();
    case "cli":
      return cmdCli(rest);
    case "upgrade":
      return cmdUpgrade();
    case "gql":
      return cmdGql(rest);
    case "record":
      return cmdRecord(rest);
    case "scenario":
      return cmdScenario(rest);
    case "report":
      return cmdReport();
    case "down":
      return cmdDown();
    default:
      console.log(USAGE);
      process.exit(command ? 1 : 0);
  }
}

main().catch((error) =>
  die(redactText(error instanceof Error ? (error.stack ?? error.message) : String(error)))
);
