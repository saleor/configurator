import { readdir, stat, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { logger } from "../../lib/logger";
import { ensureDirectory } from "../../lib/utils/file";

const MANAGED_DIR_NAME = ".configurator/reports";
const REPORT_EXTENSION = ".json";
const DEFAULT_MAX_REPORTS = 5;

export function extractStoreIdentifier(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    // For *.saleor.cloud, extract the subdomain (e.g., "store-rzalldyg")
    if (hostname.endsWith(".saleor.cloud")) {
      return hostname.replace(".saleor.cloud", "");
    }
    return hostname;
  } catch {
    return "unknown";
  }
}

export function formatReadableTimestamp(): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${date}_${hours}h${minutes}m${seconds}s`;
}

export function generateReportFilename(command?: string, url?: string): string {
  const storeId = url ? extractStoreIdentifier(url) : "unknown";
  const timestamp = formatReadableTimestamp();
  return `${storeId}_${timestamp}${REPORT_EXTENSION}`;
}

export function generateReportPath(command: string, url: string): string {
  const dir = resolve(process.cwd(), MANAGED_DIR_NAME, command);
  const filename = generateReportFilename(command, url);
  return join(dir, filename);
}

export function getReportsDirectory(commandSubdir?: string): string {
  if (commandSubdir) {
    return resolve(process.cwd(), MANAGED_DIR_NAME, commandSubdir);
  }
  return resolve(process.cwd(), MANAGED_DIR_NAME);
}

export function isInManagedDirectory(reportPath: string): boolean {
  const managedDir = getReportsDirectory();
  const resolvedPath = resolve(reportPath);
  return resolvedPath.startsWith(managedDir);
}

export async function resolveReportPath(
  customPath?: string,
  command?: string,
  url?: string
): Promise<string> {
  if (customPath) {
    return customPath;
  }

  const dir = command ? getReportsDirectory(command) : getReportsDirectory();
  await ensureDirectory(dir);
  return join(dir, generateReportFilename(command, url));
}

interface ReportFileEntry {
  readonly name: string;
  readonly mtimeMs: number;
}

async function listReportFiles(dir: string): Promise<readonly ReportFileEntry[]> {
  const entries = await readdir(dir);

  const reportNames = entries.filter((name) => name.endsWith(REPORT_EXTENSION));

  const withStats = await Promise.all(
    reportNames.map(async (name) => {
      const fileStat = await stat(join(dir, name));
      return { name, mtimeMs: fileStat.mtimeMs };
    })
  );

  return withStats.toSorted((a, b) => a.mtimeMs - b.mtimeMs);
}

export async function pruneOldReports(
  dir: string,
  maxReports: number = DEFAULT_MAX_REPORTS
): Promise<readonly string[]> {
  const sorted = await listReportFiles(dir);

  if (sorted.length <= maxReports) {
    return [];
  }

  const toDelete = sorted.slice(0, sorted.length - maxReports);
  const deleted: string[] = [];

  for (const entry of toDelete) {
    try {
      await unlink(join(dir, entry.name));
      deleted.push(entry.name);
    } catch (error) {
      logger.warn(`Failed to prune report ${entry.name}`, { error });
    }
  }

  return deleted;
}
