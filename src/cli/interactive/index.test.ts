import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as readline from "readline";
import { confirmPrompt, selectPrompt, displayDiffSummary } from "./index";

// Mock readline
vi.mock("readline");
const mockReadline = vi.mocked(readline);

describe("CLI Interactive", () => {
  let mockInterface: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    // Mock readline interface
    mockInterface = {
      question: vi.fn(),
      close: vi.fn(),
    };
    mockReadline.createInterface.mockReturnValue(mockInterface);

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("confirmPrompt", () => {
    it('should return true when user enters "y"', async () => {
      // Arrange
      mockInterface.question.mockImplementation(
        (question: string, callback: (answer: string) => void) => {
          callback("y");
        }
      );

      // Act
      const result = await confirmPrompt("Continue?");

      // Assert
      expect(result).toBe(true);
      expect(mockInterface.question).toHaveBeenCalledWith(
        "Continue? [y/N]: ",
        expect.any(Function)
      );
      expect(mockInterface.close).toHaveBeenCalled();
    });

    it('should return false when user enters "n"', async () => {
      // Arrange
      mockInterface.question.mockImplementation(
        (question: string, callback: (answer: string) => void) => {
          callback("n");
        }
      );

      // Act
      const result = await confirmPrompt("Continue?");

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when user enters "yes"', async () => {
      // Arrange
      mockInterface.question.mockImplementation(
        (question: string, callback: (answer: string) => void) => {
          callback("yes");
        }
      );

      // Act
      const result = await confirmPrompt("Continue?");

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user enters "no"', async () => {
      // Arrange
      mockInterface.question.mockImplementation(
        (question: string, callback: (answer: string) => void) => {
          callback("no");
        }
      );

      // Act
      const result = await confirmPrompt("Continue?");

      // Assert
      expect(result).toBe(false);
    });

    it("should return default value when user enters empty string", async () => {
      // Arrange
      mockInterface.question.mockImplementation(
        (question: string, callback: (answer: string) => void) => {
          callback("");
        }
      );

      // Act
      const result = await confirmPrompt("Continue?", true);

      // Assert
      expect(result).toBe(true);
      expect(mockInterface.question).toHaveBeenCalledWith(
        "Continue? [Y/n]: ",
        expect.any(Function)
      );
    });

    it("should return default value when user enters invalid input", async () => {
      // Arrange
      mockInterface.question.mockImplementation(
        (question: string, callback: (answer: string) => void) => {
          callback("invalid");
        }
      );

      // Act
      const result = await confirmPrompt("Continue?", true);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("selectPrompt", () => {
    it("should return selected choice when valid number is entered", async () => {
      // Arrange
      const choices = ["Option 1", "Option 2", "Option 3"];
      mockInterface.question.mockImplementation(
        (question: string, callback: (answer: string) => void) => {
          callback("2");
        }
      );

      // Act
      const result = await selectPrompt("Choose an option:", choices);

      // Assert
      expect(result).toBe("Option 2");
      expect(consoleLogSpy).toHaveBeenCalledWith("\nChoose an option:");
      expect(consoleLogSpy).toHaveBeenCalledWith("  1. Option 1");
      expect(consoleLogSpy).toHaveBeenCalledWith("  2. Option 2");
      expect(consoleLogSpy).toHaveBeenCalledWith("  3. Option 3");
    });

    it("should return first choice when invalid number is entered", async () => {
      // Arrange
      const choices = ["Option 1", "Option 2"];
      mockInterface.question.mockImplementation(
        (question: string, callback: (answer: string) => void) => {
          callback("5");
        }
      );

      // Act
      const result = await selectPrompt("Choose an option:", choices);

      // Assert
      expect(result).toBe("Option 1");
    });

    it("should return first choice when non-number is entered", async () => {
      // Arrange
      const choices = ["Option 1", "Option 2"];
      mockInterface.question.mockImplementation(
        (question: string, callback: (answer: string) => void) => {
          callback("invalid");
        }
      );

      // Act
      const result = await selectPrompt("Choose an option:", choices);

      // Assert
      expect(result).toBe("Option 1");
    });
  });

  describe("displayDiffSummary", () => {
    it("should display no changes message when totalChanges is 0", () => {
      // Arrange
      const summary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
      };

      // Act
      displayDiffSummary(summary);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "\n✅ No differences found - configurations are already in sync"
      );
    });

    it("should display diff summary with all change types", () => {
      // Arrange
      const summary = {
        totalChanges: 6,
        creates: 2,
        updates: 3,
        deletes: 1,
      };

      // Act
      displayDiffSummary(summary);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith("\n📊 Configuration Differences Summary:");
      expect(consoleLogSpy).toHaveBeenCalledWith("   Total Changes: 6");
      expect(consoleLogSpy).toHaveBeenCalledWith("   🟢 Creates: 2");
      expect(consoleLogSpy).toHaveBeenCalledWith("   🟡 Updates: 3");
      expect(consoleLogSpy).toHaveBeenCalledWith("   🔴 Deletes: 1");
    });

    it("should display only relevant change types", () => {
      // Arrange
      const summary = {
        totalChanges: 2,
        creates: 2,
        updates: 0,
        deletes: 0,
      };

      // Act
      displayDiffSummary(summary);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith("\n📊 Configuration Differences Summary:");
      expect(consoleLogSpy).toHaveBeenCalledWith("   Total Changes: 2");
      expect(consoleLogSpy).toHaveBeenCalledWith("   🟢 Creates: 2");
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining("Updates:"));
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining("Deletes:"));
    });

    it("should display empty line at end", () => {
      // Arrange
      const summary = {
        totalChanges: 1,
        creates: 1,
        updates: 0,
        deletes: 0,
      };

      // Act
      displayDiffSummary(summary);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith("");
    });
  });
});
