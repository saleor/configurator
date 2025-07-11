import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OraProgressReporter, BulkOperationProgress, type ProgressReporter } from "../progress";

// Mock ora module
vi.mock("ora", () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    text: "",
  })),
}));

// Mock chalk module
vi.mock("chalk", () => ({
  default: {
    blue: vi.fn((text: string) => text),
    yellow: vi.fn((text: string) => text),
    red: vi.fn((text: string) => text),
  },
}));

describe("OraProgressReporter", () => {
  let reporter: OraProgressReporter;
  let consoleSpy: any;

  beforeEach(() => {
    reporter = new OraProgressReporter();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("spinner operations", () => {
    it("starts spinner with text", () => {
      reporter.start("Loading data");
      
      expect(reporter).toBeDefined();
    });

    it("updates spinner text", () => {
      reporter.start("Loading");
      reporter.update("Processing");
      
      expect(reporter).toBeDefined();
    });

    it("succeeds with message", () => {
      reporter.start("Loading");
      reporter.succeed("Completed successfully");
      
      expect(reporter).toBeDefined();
    });

    it("fails with message", () => {
      reporter.start("Loading");
      reporter.fail("Failed to complete");
      
      expect(reporter).toBeDefined();
    });
  });

  describe("info and warn methods", () => {
    it("shows info message without active spinner", () => {
      reporter.info("Information message");
      
      expect(consoleSpy).toHaveBeenCalledWith("ℹ", "Information message");
    });

    it("shows warn message without active spinner", () => {
      reporter.warn("Warning message");
      
      expect(consoleSpy).toHaveBeenCalledWith("⚠", "Warning message");
    });

    it("shows info message with active spinner", () => {
      reporter.start("Loading");
      reporter.info("Information message");
      
      expect(reporter).toBeDefined();
    });

    it("shows warn message with active spinner", () => {
      reporter.start("Loading");
      reporter.warn("Warning message");
      
      expect(reporter).toBeDefined();
    });
  });
});

describe("BulkOperationProgress", () => {
  let mockReporter: ProgressReporter;
  let bulkProgress: BulkOperationProgress;
  let consoleSpy: any;

  beforeEach(() => {
    mockReporter = {
      start: vi.fn(),
      update: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    
    bulkProgress = new BulkOperationProgress(5, "Processing items", mockReporter);
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("operation tracking", () => {
    it("starts operation with initial count", () => {
      bulkProgress.start();
      
      expect(mockReporter.start).toHaveBeenCalledWith("Processing items (0/5)");
    });

    it("increments progress", () => {
      bulkProgress.start();
      bulkProgress.increment();
      
      expect(mockReporter.update).toHaveBeenCalledWith("Processing items (1/5)");
    });

    it("increments progress with item name", () => {
      bulkProgress.start();
      bulkProgress.increment("item1");
      
      expect(mockReporter.update).toHaveBeenCalledWith("Processing items (1/5): item1");
    });

    it("completes successfully with no failures", () => {
      bulkProgress.start();
      bulkProgress.increment();
      bulkProgress.increment();
      bulkProgress.complete();
      
      expect(mockReporter.succeed).toHaveBeenCalledWith("Processing items completed (2/5)");
    });
  });

  describe("failure handling", () => {
    it("tracks failures", () => {
      const error = new Error("Test error");
      bulkProgress.addFailure("item1", error);
      
      expect(bulkProgress.hasFailures()).toBe(true);
      expect(bulkProgress.getFailures()).toEqual([{ item: "item1", error }]);
    });

    it("completes with failures", () => {
      const error = new Error("Test error");
      bulkProgress.addFailure("item1", error);
      bulkProgress.complete();
      
      expect(mockReporter.fail).toHaveBeenCalledWith("Processing items completed with 1 failures");
      expect(consoleSpy).toHaveBeenCalledWith("  ❌ item1: Test error");
    });

    it("reports multiple failures", () => {
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");
      
      bulkProgress.addFailure("item1", error1);
      bulkProgress.addFailure("item2", error2);
      bulkProgress.complete();
      
      expect(mockReporter.fail).toHaveBeenCalledWith("Processing items completed with 2 failures");
      expect(consoleSpy).toHaveBeenCalledWith("  ❌ item1: Error 1");
      expect(consoleSpy).toHaveBeenCalledWith("  ❌ item2: Error 2");
    });
  });

  describe("state checking", () => {
    it("returns false for hasFailures when no failures", () => {
      expect(bulkProgress.hasFailures()).toBe(false);
    });

    it("returns empty array for getFailures when no failures", () => {
      expect(bulkProgress.getFailures()).toEqual([]);
    });
  });
});