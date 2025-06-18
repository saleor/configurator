import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaxService } from "./tax-service";
import type { TaxRepository } from "./repository";
import type { ChannelService } from "../channel/channel-service";

const mockRepository = {
  getTaxConfigurations: vi.fn(),
  getTaxClasses: vi.fn(),
  createTaxClass: vi.fn(),
  updateTaxClass: vi.fn(),
  updateTaxConfiguration: vi.fn(),
  updateTaxClassCountryRates: vi.fn(),
  updateTaxConfigurationPerCountry: vi.fn(),
} as unknown as TaxRepository;

const mockChannelService = {
  getChannelsBySlug: vi.fn(),
} as unknown as ChannelService;

describe("TaxService", () => {
  let service: TaxService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TaxService(mockRepository, mockChannelService);
  });

  describe("upsertTaxClasses", () => {
    it("should create new tax classes when they don't exist", async () => {
      // Arrange
      const classes = [
        {
          name: "Standard Rate",
          countryRates: [
            { countryCode: "US", rate: 8.875 },
            { countryCode: "CA", rate: 13 },
          ],
        },
      ];

      vi.mocked(mockRepository.getTaxClasses).mockResolvedValue([]);
      vi.mocked(mockRepository.createTaxClass).mockResolvedValue({
        id: "class-1",
        name: "Standard Rate",
        countries: [],
      });
      vi.mocked(mockRepository.updateTaxClassCountryRates).mockResolvedValue({
        id: "class-1",
        name: "Standard Rate",
        countries: [
          { country: { code: "US", country: "United States" }, rate: 8.875 },
          { country: { code: "CA", country: "Canada" }, rate: 13 },
        ],
      });

      // Act
      const result = await service.upsertTaxClasses(classes);

      // Assert
      expect(mockRepository.getTaxClasses).toHaveBeenCalledOnce();
      expect(mockRepository.createTaxClass).toHaveBeenCalledWith({
        name: "Standard Rate",
      });
      expect(mockRepository.updateTaxClassCountryRates).toHaveBeenCalledWith(
        "class-1",
        [
          { countryCode: "US", rate: 8.875 },
          { countryCode: "CA", rate: 13 },
        ]
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("class-1");
    });

    it("should update existing tax classes", async () => {
      // Arrange
      const classes = [
        {
          name: "Reduced Rate",
          countryRates: [{ countryCode: "DE", rate: 7 }],
        },
      ];

      vi.mocked(mockRepository.getTaxClasses).mockResolvedValue([
        {
          id: "class-2",
          name: "Reduced Rate",
          countries: [{ country: { code: "DE", country: "Germany" }, rate: 5 }],
        },
      ]);
      vi.mocked(mockRepository.updateTaxClass).mockResolvedValue({
        id: "class-2",
        name: "Reduced Rate",
        countries: [],
      });
      vi.mocked(mockRepository.updateTaxClassCountryRates).mockResolvedValue({
        id: "class-2",
        name: "Reduced Rate",
        countries: [{ country: { code: "DE", country: "Germany" }, rate: 7 }],
      });

      // Act
      const result = await service.upsertTaxClasses(classes);

      // Assert
      expect(mockRepository.updateTaxClass).toHaveBeenCalledWith("class-2", {
        name: "Reduced Rate",
      });
      expect(mockRepository.updateTaxClassCountryRates).toHaveBeenCalledWith(
        "class-2",
        [{ countryCode: "DE", rate: 7 }]
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("configureTaxSettings", () => {
    it("should configure tax settings for channels", async () => {
      // Arrange
      const configurations = [
        {
          channelSlug: "us",
          chargeTaxes: true,
          displayGrossPrices: false,
          pricesEnteredWithTax: false,
          countryExceptions: [
            {
              countryCode: "CA",
              chargeTaxes: true,
              displayGrossPrices: false,
            },
          ],
        },
      ];

      vi.mocked(mockRepository.getTaxConfigurations).mockResolvedValue([
        {
          id: "config-1",
          chargeTaxes: false,
          displayGrossPrices: false,
          pricesEnteredWithTax: false,
          channel: { id: "channel-1", slug: "us" },
        },
      ]);
      vi.mocked(mockChannelService.getChannelsBySlug).mockResolvedValue([
        { id: "channel-1", slug: "us" },
      ]);
      vi.mocked(mockRepository.updateTaxConfiguration).mockResolvedValue({
        id: "config-1",
        chargeTaxes: true,
        displayGrossPrices: false,
        pricesEnteredWithTax: false,
        channel: { id: "channel-1", slug: "us" },
      });

      // Act
      const result = await service.configureTaxSettings(configurations);

      // Assert
      expect(mockChannelService.getChannelsBySlug).toHaveBeenCalledWith(["us"]);
      expect(mockRepository.updateTaxConfiguration).toHaveBeenCalledWith(
        "config-1",
        {
          chargeTaxes: true,
          displayGrossPrices: false,
          pricesEnteredWithTax: false,
        }
      );
      expect(mockRepository.updateTaxConfigurationPerCountry).toHaveBeenCalledWith(
        "config-1",
        [
          {
            countryCode: "CA",
            chargeTaxes: true,
            displayGrossPrices: false,
          },
        ]
      );
      expect(result).toHaveLength(1);
    });

    it("should handle missing channels gracefully", async () => {
      // Arrange
      const configurations = [
        {
          channelSlug: "nonexistent",
          chargeTaxes: true,
        },
      ];

      vi.mocked(mockChannelService.getChannelsBySlug).mockResolvedValue([]);
      vi.mocked(mockRepository.getTaxConfigurations).mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.configureTaxSettings(configurations)
      ).rejects.toThrow("Channel not found: nonexistent");
    });
  });
}); 