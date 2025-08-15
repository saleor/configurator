import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaxService } from "./tax-service";
import type { TaxRepository } from "./repository";
import type { Logger } from "../../lib/logger";
import { TaxClassValidationError, DuplicateTaxClassError, InvalidCountryRateError } from "./errors";
import type { TaxClassInput } from "../config/schema/schema";

describe("TaxService", () => {
  let taxService: TaxService;
  let mockRepository: TaxRepository;
  let mockLogger: Logger;

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
  });

  describe("validateUniqueIdentifiers", () => {
    it("should pass validation for unique tax class names", () => {
      const taxClasses: TaxClassInput[] = [
        { name: "Standard Rate" },
        { name: "Reduced Rate" },
        { name: "Zero Rate" },
      ];

      expect(() => taxService.validateUniqueIdentifiers(taxClasses)).not.toThrow();
    });

    it("should throw error for duplicate tax class names", () => {
      const taxClasses: TaxClassInput[] = [
        { name: "Standard Rate" },
        { name: "Reduced Rate" },
        { name: "Standard Rate" }, // duplicate
      ];

      expect(() => taxService.validateUniqueIdentifiers(taxClasses)).toThrow(
        TaxClassValidationError
      );
    });
  });

  describe("createTaxClass", () => {
    it("should create a tax class with valid data", async () => {
      const input: TaxClassInput = {
        name: "Standard Rate",
        countryRates: [
          { countryCode: "US", rate: 8.5 },
          { countryCode: "GB", rate: 20 },
        ],
      };

      const expectedResult = {
        id: "tax-class-1",
        name: "Standard Rate",
        countryRates: [
          { countryCode: "US", rate: 8.5 },
          { countryCode: "GB", rate: 20 },
        ],
      };

      vi.mocked(mockRepository.getAllTaxClasses).mockResolvedValue([]);
      vi.mocked(mockRepository.createTaxClass).mockResolvedValue(expectedResult);

      const result = await taxService.createTaxClass(input);

      expect(result).toEqual(expectedResult);
      expect(mockRepository.createTaxClass).toHaveBeenCalledWith({
        name: "Standard Rate",
        createCountryRates: [
          { countryCode: "US", rate: 8.5 },
          { countryCode: "GB", rate: 20 },
        ],
      });
    });

    it("should throw error for duplicate tax class name", async () => {
      const input: TaxClassInput = {
        name: "Standard Rate",
      };

      vi.mocked(mockRepository.getAllTaxClasses).mockResolvedValue([
        { id: "existing", name: "Standard Rate", countryRates: [] },
      ]);

      await expect(taxService.createTaxClass(input)).rejects.toThrow(DuplicateTaxClassError);
    });

    it("should validate tax class before creation", async () => {
      const input: TaxClassInput = {
        name: "",
        countryRates: [{ countryCode: "US", rate: -5 }], // invalid rate
      };

      await expect(taxService.createTaxClass(input)).rejects.toThrow(TaxClassValidationError);
    });
  });

  describe("updateTaxClass", () => {
    it("should update a tax class with valid data", async () => {
      const input: TaxClassInput = {
        name: "Updated Rate",
        countryRates: [{ countryCode: "US", rate: 10 }],
      };

      const expectedResult = {
        id: "tax-class-1",
        name: "Updated Rate",
        countryRates: [{ countryCode: "US", rate: 10 }],
      };

      vi.mocked(mockRepository.updateTaxClass).mockResolvedValue(expectedResult);

      const result = await taxService.updateTaxClass("tax-class-1", input);

      expect(result).toEqual(expectedResult);
      expect(mockRepository.updateTaxClass).toHaveBeenCalledWith("tax-class-1", {
        name: "Updated Rate",
        updateCountryRates: [{ countryCode: "US", rate: 10 }],
      });
    });
  });

  describe("getOrCreateTaxClass", () => {
    it("should return existing tax class if found", async () => {
      const input: TaxClassInput = { name: "Standard Rate" };
      const existing = { id: "existing", name: "Standard Rate", countryRates: [] };

      vi.mocked(mockRepository.getAllTaxClasses).mockResolvedValue([existing]);

      const result = await taxService.getOrCreateTaxClass(input);

      expect(result).toEqual({ ...existing, ...input });
      expect(mockRepository.createTaxClass).not.toHaveBeenCalled();
    });

    it("should create new tax class if not found", async () => {
      const input: TaxClassInput = { name: "New Rate" };
      const created = { id: "new", name: "New Rate", countryRates: [] };

      vi.mocked(mockRepository.getAllTaxClasses).mockResolvedValue([]);
      vi.mocked(mockRepository.createTaxClass).mockResolvedValue(created);

      const result = await taxService.getOrCreateTaxClass(input);

      expect(result).toEqual({ ...created, ...input });
      expect(mockRepository.createTaxClass).toHaveBeenCalled();
    });
  });

  describe("bootstrapTaxClasses", () => {
    it("should bootstrap multiple tax classes", async () => {
      const taxClasses: TaxClassInput[] = [{ name: "Standard Rate" }, { name: "Reduced Rate" }];

      vi.mocked(mockRepository.getAllTaxClasses).mockResolvedValue([]);
      vi.mocked(mockRepository.createTaxClass)
        .mockResolvedValueOnce({ id: "1", name: "Standard Rate", countryRates: [] })
        .mockResolvedValueOnce({ id: "2", name: "Reduced Rate", countryRates: [] });

      const results = await taxService.bootstrapTaxClasses(taxClasses);

      expect(results).toHaveLength(2);
      expect(mockRepository.createTaxClass).toHaveBeenCalledTimes(2);
    });
  });

  describe("validation", () => {
    it("should validate empty tax class name", async () => {
      const input: TaxClassInput = { name: "" };

      await expect(taxService.createTaxClass(input)).rejects.toThrow(
        new TaxClassValidationError("Tax class name cannot be empty")
      );
    });

    it("should validate duplicate country codes", async () => {
      const input: TaxClassInput = {
        name: "Test Rate",
        countryRates: [
          { countryCode: "US", rate: 8.5 },
          { countryCode: "US", rate: 10 }, // duplicate
        ],
      };

      await expect(taxService.createTaxClass(input)).rejects.toThrow(TaxClassValidationError);
    });

    it("should validate tax rate range", async () => {
      const input: TaxClassInput = {
        name: "Invalid Rate",
        countryRates: [
          { countryCode: "US", rate: -5 }, // below 0
          { countryCode: "GB", rate: 150 }, // above 100
        ],
      };

      await expect(taxService.createTaxClass(input)).rejects.toThrow(InvalidCountryRateError);
    });
  });

  describe("updateChannelTaxConfiguration", () => {
    it("should update tax configuration for existing channel", async () => {
      const channelId = "channel-1";
      const input = {
        taxCalculationStrategy: "FLAT_RATES" as const,
        chargeTaxes: true,
      };

      const mockConfigurations = [
        {
          id: "config-1",
          channelId: "channel-1",
          channelSlug: "default",
          channelName: "Default",
          chargeTaxes: false,
          displayGrossPrices: true,
          pricesEnteredWithTax: true,
        },
      ];

      const expectedResult = { ...mockConfigurations[0], ...input };

      vi.mocked(mockRepository.getAllTaxConfigurations).mockResolvedValue(mockConfigurations);
      vi.mocked(mockRepository.updateTaxConfiguration).mockResolvedValue(expectedResult);

      const result = await taxService.updateChannelTaxConfiguration(channelId, input);

      expect(result).toEqual(expectedResult);
      expect(mockRepository.updateTaxConfiguration).toHaveBeenCalledWith("config-1", input);
    });

    it("should throw error if channel tax configuration not found", async () => {
      const channelId = "nonexistent-channel";
      const input = { chargeTaxes: true };

      vi.mocked(mockRepository.getAllTaxConfigurations).mockResolvedValue([]);

      await expect(taxService.updateChannelTaxConfiguration(channelId, input)).rejects.toThrow(
        "Tax configuration for channel nonexistent-channel not found"
      );
    });
  });

  describe("syncCountryRates", () => {
    it("should sync country rates for a tax class", async () => {
      const taxClass = {
        id: "tax-class-1",
        name: "Standard Rate",
        countryRates: [
          { countryCode: "US" as const, rate: 8.5 },
          { countryCode: "GB" as const, rate: 20 },
        ],
      };

      await taxService.syncCountryRates(taxClass);

      expect(mockRepository.updateTaxCountryConfiguration).toHaveBeenCalledTimes(2);
      expect(mockRepository.updateTaxCountryConfiguration).toHaveBeenCalledWith("US", [
        { taxClassId: "tax-class-1", rate: 8.5 },
      ]);
      expect(mockRepository.updateTaxCountryConfiguration).toHaveBeenCalledWith("GB", [
        { taxClassId: "tax-class-1", rate: 20 },
      ]);
    });

    it("should skip syncing if no country rates or ID", async () => {
      const taxClassWithoutId = {
        name: "Standard Rate",
        countryRates: [{ countryCode: "US" as const, rate: 8.5 }],
      };

      await taxService.syncCountryRates(taxClassWithoutId);

      expect(mockRepository.updateTaxCountryConfiguration).not.toHaveBeenCalled();
    });
  });
});
