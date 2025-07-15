import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServiceContainer } from "../service-container";
import { DiffService } from "./service";

// Mock the service container and its dependencies
const mockServiceContainer = {
  configStorage: {
    load: vi.fn(),
  },
  configuration: {
    retrieve: vi.fn(),
  },
} as unknown as ServiceContainer;

describe("DiffService - Introspect Functionality", () => {
  let diffService: DiffService;

  beforeEach(() => {
    vi.clearAllMocks();
    diffService = new DiffService(mockServiceContainer);
  });

  describe("diffForIntrospectWithFormatting", () => {
    it("should format diff results with table format", async () => {
      // Mock the compareForIntrospect method
      const mockSummary = {
        totalChanges: 2,
        creates: 1,
        updates: 1,
        deletes: 0,
        results: [],
      };

      vi.spyOn(diffService, "compareForIntrospect").mockResolvedValue(mockSummary);

      const result = await diffService.diffForIntrospectWithFormatting({
        format: "table",
        quiet: true,
        includeSections: ["shop"],
        excludeSections: [],
      });

      expect(result).toEqual({
        summary: mockSummary,
        formattedOutput: expect.any(String),
      });
    });

    it("should format diff results with JSON format", async () => {
      const mockSummary = {
        totalChanges: 1,
        creates: 0,
        updates: 1,
        deletes: 0,
        results: [],
      };

      vi.spyOn(diffService, "compareForIntrospect").mockResolvedValue(mockSummary);

      const result = await diffService.diffForIntrospectWithFormatting({
        format: "json",
        quiet: true,
      });

      expect(result).toEqual({
        summary: mockSummary,
        formattedOutput: JSON.stringify(mockSummary, null, 2),
      });
    });

    it("should handle no changes scenario", async () => {
      const mockSummary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        results: [],
      };

      vi.spyOn(diffService, "compareForIntrospect").mockResolvedValue(mockSummary);

      const result = await diffService.diffForIntrospectWithFormatting({
        format: "table",
        quiet: true,
      });

      expect(result).toEqual({
        summary: mockSummary,
        formattedOutput: undefined, // No formatted output for no changes
      });
    });

    it("should pass selective options to compareForIntrospect", async () => {
      const mockSummary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        results: [],
      };

      const compareForIntrospectSpy = vi
        .spyOn(diffService, "compareForIntrospect")
        .mockResolvedValue(mockSummary);

      await diffService.diffForIntrospectWithFormatting({
        format: "table",
        quiet: true,
        includeSections: ["shop", "channels"],
        excludeSections: ["products"],
      });

      expect(compareForIntrospectSpy).toHaveBeenCalledWith({
        includeSections: ["shop", "channels"],
        excludeSections: ["products"],
      });
    });
  });
});
