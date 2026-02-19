import { readdir, stat, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { logger } from "../../lib/logger";
import { ensureDirectory } from "../../lib/utils/file";

const MANAGED_DIR_NAME = ".configurator/reports";
const REPORT_GLOB_PREFIX = "deployment-report-";
const REPORT_EXTENSION = ".json";
const DEFAULT_MAX_REPORTS = 5;

export function generateReportFilename(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "")
    .replace("T", "_");
  return `${REPORT_GLOB_PREFIX}${timestamp}${REPORT_EXTENSION}`;
}

export function getReportsDirectory(): string {
  return resolve(process.cwd(), MANAGED_DIR_NAME);
}

export function isInManagedDirectory(reportPath: string): boolean {
  const managedDir = getReportsDirectory();
  const resolvedPath = resolve(reportPath);
  return resolvedPath.startsWith(managedDir);
}

export async function resolveReportPath(customPath?: string): Promise<string> {
  if (customPath) {
    return customPath;
  }

  const dir = getReportsDirectory();
  await ensureDirectory(dir);
  return join(dir, generateReportFilename());
}

interface ReportFileEntry {
  readonly name: string;
  readonly mtimeMs: number;
}

async function listReportFiles(dir: string): Promise<readonly ReportFileEntry[]> {
  const entries = await readdir(dir);

  const reportNames = entries.filter(
    (name) => name.startsWith(REPORT_GLOB_PREFIX) && name.endsWith(REPORT_EXTENSION)
  );

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
