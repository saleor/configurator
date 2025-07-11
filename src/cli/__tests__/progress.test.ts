import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProgressIndicator } from "../progress";
import { cliConsole } from "../console";

vi.mock("../console", () => ({
  cliConsole: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ProgressIndicator", () => {
  let indicator: ProgressIndicator;
  let writeSpy: any;
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    indicator = new ProgressIndicator();
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    originalIsTTY = process.stdout.isTTY;
    
    // Mock TTY environment and methods
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    });
    
    // Mock clearLine and cursorTo if they don't exist
    if (!process.stdout.clearLine) {
      (process.stdout as any).clearLine = vi.fn();
    }
    if (!process.stdout.cursorTo) {
      (process.stdout as any).cursorTo = vi.fn();
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
    
    // Restore TTY state
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      configurable: true,
    });
  });

  describe("spinner", () => {
    it("starts and stops spinner", () => {
      vi.useFakeTimers();
      
      const cleanup = indicator.startSpinner("Loading");
      
      // Advance timer to show a few frames
      vi.advanceTimersByTime(160);
      
      // Should have written spinner frames
      expect(writeSpy).toHaveBeenCalled();
      const output = writeSpy.mock.calls.map(call => call[0]).join("");
      expect(output).toContain("Loading");
      
      cleanup();
      
      // Verify timer is cleared
      vi.advanceTimersByTime(160);
      const callCountAfterCleanup = writeSpy.mock.calls.length;
      vi.advanceTimersByTime(160);
      expect(writeSpy.mock.calls.length).toBe(callCountAfterCleanup);
    });

    it("updates spinner message", () => {
      vi.useFakeTimers();
      
      indicator.startSpinner("Initial");
      vi.advanceTimersByTime(80);
      
      indicator.updateMessage("Updated");
      
      const output = writeSpy.mock.calls.map(call => call[0]).join("");
      expect(output).toContain("Updated");
    });

    it("cycles through spinner frames", () => {
      vi.useFakeTimers();
      
      indicator.startSpinner("Test");
      
      // Advance through multiple frames
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(80);
      }
      
      const output = writeSpy.mock.calls.map(call => call[0]).join("");
      // Should contain different spinner characters
      expect(output).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/);
    });
  });

  describe("progress bar", () => {
    it("displays progress bar with percentage", () => {
      indicator.showProgress({
        current: 5,
        total: 10,
        message: "Processing",
        width: 10,
      });

      const output = writeSpy.mock.calls.map(call => call[0]).join("");
      expect(output).toContain("[█████     ]");
      expect(output).toContain("50%");
      expect(output).toContain("Processing");
    });

    it("handles 100% progress", () => {
      indicator.showProgress({
        current: 10,
        total: 10,
        message: "Complete",
        width: 10,
      });

      const output = writeSpy.mock.calls.map(call => call[0]).join("");
      expect(output).toContain("[██████████]");
      expect(output).toContain("100%");
    });

    it("handles 0% progress", () => {
      indicator.showProgress({
        current: 0,
        total: 10,
        message: "Starting",
        width: 10,
      });

      const output = writeSpy.mock.calls.map(call => call[0]).join("");
      expect(output).toContain("[          ]");
      expect(output).toContain("0%");
    });
  });

  describe("completion", () => {
    it("shows success message", () => {
      indicator.complete("Task completed");
      
      expect(cliConsole.success).toHaveBeenCalledWith("  ✓ Task completed");
    });

    it("shows failure message", () => {
      indicator.fail("Task failed");
      
      expect(cliConsole.error).toHaveBeenCalledWith("  ✗ Task failed");
    });

    it("stops spinner on complete", () => {
      vi.useFakeTimers();
      
      const _cleanup = indicator.startSpinner("Working");
      vi.advanceTimersByTime(80);
      
      indicator.complete("Done");
      
      // Verify timer is cleared
      const callCountBeforeAdvance = writeSpy.mock.calls.length;
      vi.advanceTimersByTime(160);
      expect(writeSpy.mock.calls.length).toBe(callCountBeforeAdvance);
    });
  });

  describe("non-TTY environment", () => {
    beforeEach(() => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        configurable: true,
      });
    });

    it("handles non-TTY output", () => {
      indicator.startSpinner("Test");
      indicator.complete("Done");
      
      // Should write newlines instead of clearing lines
      const output = writeSpy.mock.calls.map(call => call[0]).join("");
      expect(output).toContain("\n");
    });
  });
});