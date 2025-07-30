import { beforeEach, describe, expect, it, vi } from "vitest";
import { cliConsole } from "../../../cli/console";
import type { DiffSummary } from "../../diff";
import { DeploymentSummaryReport } from "../summary";
import type { DeploymentMetrics } from "../types";

vi.mock("../../../cli/console", () => ({
  cliConsole: {
    box: vi.fn(),
  },
}));

describe.skip("DeploymentSummaryReport", () => {
  let mockMetrics: DeploymentMetrics;
  let mockSummary: DiffSummary;

  beforeEach(() => {
    vi.clearAllMocks();

    const now = new Date("2024-01-01T10:00:00Z");
    mockMetrics = {
      duration: 5000,
      startTime: now,
      endTime: new Date(now.getTime() + 5000),
      stageDurations: new Map([
        ["Stage 1", 2000],
        ["Stage 2", 3000],
      ]),
      entityCounts: new Map([
        ["Product", { created: 5, updated: 2, deleted: 0 }],
        ["Category", { created: 0, updated: 1, deleted: 1 }],
      ]),
    };

    mockSummary = {
      totalChanges: 9,
      creates: 5,
      updates: 3,
      deletes: 1,
      results: [],
    };
  });

  describe("display", () => {
    it("displays timing information", () => {
      const report = new DeploymentSummaryReport(mockMetrics, mockSummary);
      report.display();

      const boxCalls = vi.mocked(cliConsole.box).mock.calls;
      expect(boxCalls).toHaveLength(1);

      const [lines, title] = boxCalls[0];
      expect(title).toBe("📊 Deployment Summary");
      expect(lines).toContain("Duration: 5.0s");
      expect(lines.some((line) => line.includes("Started:"))).toBe(true);
      expect(lines.some((line) => line.includes("Completed:"))).toBe(true);
    });

    it("displays stage timing breakdown", () => {
      const report = new DeploymentSummaryReport(mockMetrics, mockSummary);
      report.display();

      const [lines] = vi.mocked(cliConsole.box).mock.calls[0];
      expect(lines).toContain("Stage Timing:");
      expect(lines).toContain("• Stage 1: 2.0s");
      expect(lines).toContain("• Stage 2: 3.0s");
    });

    it("displays changes summary", () => {
      const report = new DeploymentSummaryReport(mockMetrics, mockSummary);
      report.display();

      const [lines] = vi.mocked(cliConsole.box).mock.calls[0];
      expect(lines).toContain("Changes Applied:");
      expect(lines).toContain("• Created: 5 entities");
      expect(lines).toContain("• Updated: 3 entities");
      expect(lines).toContain("• Deleted: 1 entities");
    });

    it("displays entity breakdown", () => {
      const report = new DeploymentSummaryReport(mockMetrics, mockSummary);
      report.display();

      const [lines] = vi.mocked(cliConsole.box).mock.calls[0];
      expect(lines).toContain("By Entity Type:");
      expect(lines).toContain("• Product: 5 created, 2 updated");
      expect(lines).toContain("• Category: 1 updated, 1 deleted");
    });

    it("handles no changes", () => {
      const noChangesSummary: DiffSummary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        results: [],
      };

      const report = new DeploymentSummaryReport(mockMetrics, noChangesSummary);
      report.display();

      const [lines] = vi.mocked(cliConsole.box).mock.calls[0];
      expect(lines).toContain("No changes were applied");
    });

    it("formats durations correctly", () => {
      const metrics: DeploymentMetrics = {
        ...mockMetrics,
        duration: 65500, // 1m 5.5s
      };

      const report = new DeploymentSummaryReport(metrics, mockSummary);
      report.display();

      const [lines] = vi.mocked(cliConsole.box).mock.calls[0];
      expect(lines).toContain("Duration: 1m 5s");
    });

    it("formats millisecond durations", () => {
      const metrics: DeploymentMetrics = {
        ...mockMetrics,
        duration: 500,
      };

      const report = new DeploymentSummaryReport(metrics, mockSummary);
      report.display();

      const [lines] = vi.mocked(cliConsole.box).mock.calls[0];
      expect(lines).toContain("Duration: 500ms");
    });

    it("handles empty metrics gracefully", () => {
      const emptyMetrics: DeploymentMetrics = {
        ...mockMetrics,
        stageDurations: new Map(),
        entityCounts: new Map(),
      };

      const report = new DeploymentSummaryReport(emptyMetrics, mockSummary);
      report.display();

      const [lines] = vi.mocked(cliConsole.box).mock.calls[0];
      expect(lines).not.toContain("Stage Timing:");
      expect(lines).not.toContain("By Entity Type:");
    });

    it("only shows entity operations that occurred", () => {
      const metrics: DeploymentMetrics = {
        ...mockMetrics,
        entityCounts: new Map([["Product", { created: 5, updated: 0, deleted: 0 }]]),
      };

      const report = new DeploymentSummaryReport(metrics, mockSummary);
      report.display();

      const [lines] = vi.mocked(cliConsole.box).mock.calls[0];
      expect(lines).toContain("• Product: 5 created");
      expect(lines).not.toContain("updated");
      expect(lines).not.toContain("deleted");
    });
  });
});
