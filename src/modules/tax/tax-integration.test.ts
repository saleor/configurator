import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaxService } from "./tax-service";
import type { TaxRepository } from "./repository";
import { TaxClassComparator } from "../../core/diff/comparators/tax-class-comparator";
import type { TaxClassInput } from "../config/schema/schema";
import type { Logger } from "../../lib/logger";

describe("Tax Integration", () => {
  let taxService: TaxService;
  let mockRepository: TaxRepository;
  let mockLogger: Logger;
  let comparator: TaxClassComparator;

  beforeEach(() => {
    mockRepository = {
      getAllTaxClasses: vi.fn(),
      createTaxClass: vi.fn(),
      updateTaxClass: vi.fn(),
      deleteTaxClass: vi.fn(),
      getAllTaxConfigurations: vi.fn(),
      updateTaxConfiguration: vi.fn(),
      updateTaxCountryConfiguration: vi.fn(),
    } as unknown as TaxRepository;

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    taxService = new TaxService({
      repository: mockRepository,
      logger: mockLogger,
    });

    comparator = new TaxClassComparator();
  });

  describe("End-to-end tax class workflow", () => {
    it("should handle complete tax class lifecycle", async () => {
      // Step 1: Bootstrap initial tax classes
      const initialTaxClasses: TaxClassInput[] = [
        {
          name: "Standard Rate",
          countryRates: [
            { countryCode: "US", rate: 8.5 },
            { countryCode: "GB", rate: 20 },
          ],
        },
        {
          name: "Reduced Rate",
          countryRates: [{ countryCode: "US", rate: 4.0 }],
        },
      ];

      // Mock empty remote state
      vi.mocked(mockRepository.getAllTaxClasses).mockResolvedValue([]);

      // Mock successful creation
      vi.mocked(mockRepository.createTaxClass)
        .mockResolvedValueOnce({
          id: "tax-class-1",
          name: "Standard Rate",
          countryRates: [
            { countryCode: "US", rate: 8.5 },
            { countryCode: "GB", rate: 20 },
          ],
        })
        .mockResolvedValueOnce({
          id: "tax-class-2",
          name: "Reduced Rate",
          countryRates: [{ countryCode: "US", rate: 4.0 }],
        });

      const bootstrapResults = await taxService.bootstrapTaxClasses(initialTaxClasses);

      expect(bootstrapResults).toHaveLength(2);
      expect(mockRepository.createTaxClass).toHaveBeenCalledTimes(2);

      // Step 2: Simulate configuration changes
      const updatedTaxClasses: TaxClassInput[] = [
        {
          name: "Standard Rate",
          countryRates: [
            { countryCode: "US", rate: 9.0 }, // rate changed
            { countryCode: "GB", rate: 20 },
            { countryCode: "CA", rate: 12 }, // new country
          ],
        },
        // Reduced Rate removed
        {
          name: "Zero Rate", // new tax class
          countryRates: [{ countryCode: "GB", rate: 0 }],
        },
      ];

      // Mock current remote state
      const remoteState = [
        {
          id: "tax-class-1",
          name: "Standard Rate",
          countryRates: [
            { countryCode: "US", rate: 8.5 },
            { countryCode: "GB", rate: 20 },
          ],
        },
        {
          id: "tax-class-2",
          name: "Reduced Rate",
          countryRates: [{ countryCode: "US", rate: 4.0 }],
        },
      ];

      // Step 3: Use comparator to detect changes
      const diffResults = comparator.compare(updatedTaxClasses, remoteState);

      expect(diffResults).toHaveLength(3);

      // Verify CREATE operation for new tax class
      const createOp = diffResults.find((r) => r.operation === "CREATE");
      expect(createOp).toBeDefined();
      expect(createOp?.entityName).toBe("Zero Rate");

      // Verify UPDATE operation for changed tax class
      const updateOp = diffResults.find((r) => r.operation === "UPDATE");
      expect(updateOp).toBeDefined();
      expect(updateOp?.entityName).toBe("Standard Rate");
      expect(updateOp?.changes).toHaveLength(2); // rate change + new country

      // Verify DELETE operation for removed tax class
      const deleteOp = diffResults.find((r) => r.operation === "DELETE");
      expect(deleteOp).toBeDefined();
      expect(deleteOp?.entityName).toBe("Reduced Rate");

      // Step 4: Apply the changes
      // Mock the updated remote state after bootstrap
      vi.mocked(mockRepository.getAllTaxClasses).mockResolvedValue([
        {
          id: "tax-class-1",
          name: "Standard Rate",
          countryRates: [
            { countryCode: "US", rate: 8.5 },
            { countryCode: "GB", rate: 20 },
          ],
        },
        {
          id: "tax-class-2",
          name: "Reduced Rate",
          countryRates: [{ countryCode: "US", rate: 4.0 }],
        },
      ]);

      // Mock update and create operations
      vi.mocked(mockRepository.updateTaxClass).mockResolvedValue({
        id: "tax-class-1",
        name: "Standard Rate",
        countryRates: [
          { countryCode: "US", rate: 9.0 },
          { countryCode: "GB", rate: 20 },
          { countryCode: "CA", rate: 12 },
        ],
      });

      vi.mocked(mockRepository.createTaxClass).mockResolvedValue({
        id: "tax-class-3",
        name: "Zero Rate",
        countryRates: [{ countryCode: "GB", rate: 0 }],
      });

      const finalResults = await taxService.bootstrapTaxClasses(updatedTaxClasses);

      expect(finalResults).toHaveLength(2);
      expect(mockRepository.updateTaxClass).toHaveBeenCalledWith("tax-class-1", {
        name: "Standard Rate",
        updateCountryRates: [
          { countryCode: "US", rate: 9.0 },
          { countryCode: "GB", rate: 20 },
          { countryCode: "CA", rate: 12 },
        ],
      });
    });

    it("should handle tax configuration updates", async () => {
      const channelId = "channel-1";
      const mockConfigurations = [
        {
          id: "config-1",
          channelId: "channel-1",
          channelSlug: "default",
          channelName: "Default",
          chargeTaxes: false,
          displayGrossPrices: false,
          pricesEnteredWithTax: false,
          taxCalculationStrategy: undefined,
          taxAppId: undefined,
        },
      ];

      const updatedConfig = {
        taxCalculationStrategy: "FLAT_RATES" as const,
        chargeTaxes: true,
        displayGrossPrices: true,
      };

      vi.mocked(mockRepository.getAllTaxConfigurations).mockResolvedValue(mockConfigurations);
      vi.mocked(mockRepository.updateTaxConfiguration).mockResolvedValue({
        ...mockConfigurations[0],
        ...updatedConfig,
      });

      const result = await taxService.updateChannelTaxConfiguration(channelId, updatedConfig);

      expect(result.chargeTaxes).toBe(true);
      expect(result.displayGrossPrices).toBe(true);
      expect(result.taxCalculationStrategy).toBe("FLAT_RATES");
      expect(mockRepository.updateTaxConfiguration).toHaveBeenCalledWith("config-1", updatedConfig);
    });

    it("should validate complex tax class scenarios", () => {
      // Test validation of complex scenarios
      const complexTaxClasses: TaxClassInput[] = [
        {
          name: "EU Standard Rate",
          countryRates: [
            { countryCode: "DE", rate: 19 },
            { countryCode: "FR", rate: 20 },
            { countryCode: "IT", rate: 22 },
            { countryCode: "ES", rate: 21 },
          ],
        },
        {
          name: "US State Rates",
          countryRates: [{ countryCode: "US", rate: 7.5 }], // average rate
        },
        {
          name: "Zero Rate",
          countryRates: [
            { countryCode: "GB", rate: 0 },
            { countryCode: "US", rate: 0 },
          ],
        },
      ];

      // Should not throw validation errors
      expect(() => taxService.validateUniqueIdentifiers(complexTaxClasses)).not.toThrow();

      // Should validate individual tax class constraints
      complexTaxClasses.forEach((taxClass) => {
        expect(() => {
          if (taxClass.countryRates) {
            const countryCodesSeen = new Set<string>();
            for (const rate of taxClass.countryRates) {
              expect(countryCodesSeen.has(rate.countryCode)).toBe(false);
              countryCodesSeen.add(rate.countryCode);
              expect(rate.rate).toBeGreaterThanOrEqual(0);
              expect(rate.rate).toBeLessThanOrEqual(100);
            }
          }
        }).not.toThrow();
      });
    });

    it("should handle edge cases in comparisons", () => {
      const testCases = [
        {
          name: "Empty to populated",
          local: [{ name: "Standard Rate", countryRates: [{ countryCode: "US" as const, rate: 8.5 }] }],
          remote: [],
          expectedOperations: ["CREATE"],
        },
        {
          name: "Populated to empty",
          local: [],
          remote: [{ id: "1", name: "Standard Rate", countryRates: [{ countryCode: "US" as const, rate: 8.5 }] }],
          expectedOperations: ["DELETE"],
        },
        {
          name: "No country rates",
          local: [{ name: "Standard Rate" }],
          remote: [{ id: "1", name: "Standard Rate" }],
          expectedOperations: [],
        },
      ];

      testCases.forEach((testCase) => {
        const results = comparator.compare(testCase.local, testCase.remote);
        const operations = results.map((r) => r.operation);
        expect(operations).toEqual(testCase.expectedOperations);
      });
    });
  });
});