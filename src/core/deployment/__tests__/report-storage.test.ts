import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock("../../../lib/utils/file", () => ({
  ensureDirectory: vi.fn(),
}));

vi.mock("../../../lib/logger", () => ({
  logger: { warn: vi.fn() },
}));

import { readdir, stat, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ensureDirectory } from "../../../lib/utils/file";
import {
  generateReportFilename,
  getReportsDirectory,
  isInManagedDirectory,
  pruneOldReports,
  resolveReportPath,
} from "../report-storage";

describe("report-storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateReportFilename", () => {
    it("produces correct format", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T10:30:45.123Z"));

      const filename = generateReportFilename();
      expect(filename).toBe("deployment-report-2025-06-15_10-30-45.json");

      vi.useRealTimers();
    });
  });

  describe("getReportsDirectory", () => {
    it("resolves relative to cwd", () => {
      const dir = getReportsDirectory();
      expect(dir).toBe(resolve(process.cwd(), ".configurator/reports"));
    });
  });

  describe("isInManagedDirectory", () => {
    it("returns true for paths inside managed directory", () => {
      const managedPath = join(getReportsDirectory(), "deployment-report-2025-06-15_10-30-45.json");
      expect(isInManagedDirectory(managedPath)).toBe(true);
    });

    it("returns false for paths outside managed directory", () => {
      expect(isInManagedDirectory("/tmp/custom-report.json")).toBe(false);
    });

    it("returns false for root-level report files", () => {
      expect(isInManagedDirectory("deployment-report-2025-06-15_10-30-45.json")).toBe(false);
    });
  });

  describe("resolveReportPath", () => {
    it("returns custom path as-is when provided", async () => {
      const result = await resolveReportPath("custom-report.json");
      expect(result).toBe("custom-report.json");
      expect(ensureDirectory).not.toHaveBeenCalled();
    });

    it("creates directory and returns managed path when no custom path", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T10:30:45.123Z"));

      const result = await resolveReportPath();

      expect(ensureDirectory).toHaveBeenCalledWith(getReportsDirectory());
      expect(result).toBe(
        join(getReportsDirectory(), "deployment-report-2025-06-15_10-30-45.json")
      );

      vi.useRealTimers();
    });
  });

  describe("pruneOldReports", () => {
    const dir = "/fake/reports";

    const makeStatMock = (entries: Record<string, number>) =>
      vi.mocked(stat).mockImplementation(async (path) => {
        const name = String(path).split("/").pop() ?? "";
        return { mtimeMs: entries[name] ?? 0 } as Awaited<ReturnType<typeof stat>>;
      });

    it("deletes nothing when count <= maxReports", async () => {
      vi.mocked(readdir).mockResolvedValue([
        "deployment-report-2025-06-01_01-00-00.json",
        "deployment-report-2025-06-02_01-00-00.json",
      ] as unknown as Awaited<ReturnType<typeof readdir>>);

      makeStatMock({
        "deployment-report-2025-06-01_01-00-00.json": 1000,
        "deployment-report-2025-06-02_01-00-00.json": 2000,
      });

      const deleted = await pruneOldReports(dir, 5);
      expect(deleted).toEqual([]);
      expect(unlink).not.toHaveBeenCalled();
    });

    it("deletes oldest files when count > maxReports", async () => {
      const files = [
        "deployment-report-2025-06-01_01-00-00.json",
        "deployment-report-2025-06-02_01-00-00.json",
        "deployment-report-2025-06-03_01-00-00.json",
        "deployment-report-2025-06-04_01-00-00.json",
        "deployment-report-2025-06-05_01-00-00.json",
        "deployment-report-2025-06-06_01-00-00.json",
        "deployment-report-2025-06-07_01-00-00.json",
      ];

      vi.mocked(readdir).mockResolvedValue(files as unknown as Awaited<ReturnType<typeof readdir>>);

      makeStatMock(Object.fromEntries(files.map((f, i) => [f, (i + 1) * 1000])));

      const deleted = await pruneOldReports(dir, 5);

      expect(deleted).toEqual([
        "deployment-report-2025-06-01_01-00-00.json",
        "deployment-report-2025-06-02_01-00-00.json",
      ]);
      expect(unlink).toHaveBeenCalledTimes(2);
      expect(unlink).toHaveBeenCalledWith(join(dir, "deployment-report-2025-06-01_01-00-00.json"));
      expect(unlink).toHaveBeenCalledWith(join(dir, "deployment-report-2025-06-02_01-00-00.json"));
    });

    it("ignores non-report files", async () => {
      vi.mocked(readdir).mockResolvedValue([
        "deployment-report-2025-06-01_01-00-00.json",
        "other-file.json",
        "README.md",
      ] as unknown as Awaited<ReturnType<typeof readdir>>);

      makeStatMock({
        "deployment-report-2025-06-01_01-00-00.json": 1000,
      });

      const deleted = await pruneOldReports(dir, 5);
      expect(deleted).toEqual([]);
    });

    it("continues on individual file deletion failure", async () => {
      const files = [
        "deployment-report-2025-06-01_01-00-00.json",
        "deployment-report-2025-06-02_01-00-00.json",
        "deployment-report-2025-06-03_01-00-00.json",
        "deployment-report-2025-06-04_01-00-00.json",
        "deployment-report-2025-06-05_01-00-00.json",
        "deployment-report-2025-06-06_01-00-00.json",
        "deployment-report-2025-06-07_01-00-00.json",
      ];

      vi.mocked(readdir).mockResolvedValue(files as unknown as Awaited<ReturnType<typeof readdir>>);

      makeStatMock(Object.fromEntries(files.map((f, i) => [f, (i + 1) * 1000])));

      // First unlink fails, second succeeds
      vi.mocked(unlink).mockRejectedValueOnce(new Error("EACCES")).mockResolvedValueOnce(undefined);

      const deleted = await pruneOldReports(dir, 5);

      // Only the second file was successfully deleted
      expect(deleted).toEqual(["deployment-report-2025-06-02_01-00-00.json"]);
      expect(unlink).toHaveBeenCalledTimes(2);
    });

    it("uses default maxReports of 5", async () => {
      const files = Array.from(
        { length: 6 },
        (_, i) => `deployment-report-2025-06-0${i + 1}_01-00-00.json`
      );

      vi.mocked(readdir).mockResolvedValue(files as unknown as Awaited<ReturnType<typeof readdir>>);

      makeStatMock(Object.fromEntries(files.map((f, i) => [f, (i + 1) * 1000])));

      const deleted = await pruneOldReports(dir);

      expect(deleted).toEqual(["deployment-report-2025-06-01_01-00-00.json"]);
    });
  });
});
