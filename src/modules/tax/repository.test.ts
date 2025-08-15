import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Client } from "@urql/core";
import { TaxRepository } from "./repository";
import { GraphQLError } from "../../lib/errors/graphql";

describe("TaxRepository", () => {
  let repository: TaxRepository;
  let mockClient: Client;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as Client;

    repository = new TaxRepository(mockClient);
  });

  describe("getAllTaxClasses", () => {
    it("should return all tax classes with country rates", async () => {
      const mockResponse = {
        data: {
          taxClasses: {
            edges: [
              {
                node: {
                  id: "tax-class-1",
                  name: "Standard Rate",
                  countries: [
                    {
                      country: { code: "US" },
                      rate: 8.5,
                      taxClass: { id: "tax-class-1", name: "Standard Rate" },
                    },
                    {
                      country: { code: "GB" },
                      rate: 20,
                      taxClass: { id: "tax-class-1", name: "Standard Rate" },
                    },
                  ],
                },
              },
            ],
          },
        },
        error: undefined,
      };

      vi.mocked(mockClient.query).mockResolvedValue(mockResponse);

      const result = await repository.getAllTaxClasses();

      expect(result).toEqual([
        {
          id: "tax-class-1",
          name: "Standard Rate",
          countryRates: [
            { countryCode: "US", rate: 8.5 },
            { countryCode: "GB", rate: 20 },
          ],
        },
      ]);
    });

    it("should handle empty tax classes", async () => {
      const mockResponse = {
        data: { taxClasses: { edges: [] } },
        error: undefined,
      };

      vi.mocked(mockClient.query).mockResolvedValue(mockResponse);

      const result = await repository.getAllTaxClasses();

      expect(result).toEqual([]);
    });

    it("should throw GraphQLError on query error", async () => {
      const mockError = {
        message: "GraphQL query failed",
        graphQLErrors: [],
        networkError: new Error("Network error"),
      };
      vi.mocked(mockClient.query).mockResolvedValue({
        data: undefined,
        error: mockError,
      });

      await expect(repository.getAllTaxClasses()).rejects.toThrow(GraphQLError);
    });
  });

  describe("createTaxClass", () => {
    it("should create a tax class successfully", async () => {
      const input = {
        name: "Standard Rate",
        createCountryRates: [
          { countryCode: "US" as const, rate: 8.5 },
          { countryCode: "GB" as const, rate: 20 },
        ],
      };

      const mockResponse = {
        data: {
          taxClassCreate: {
            errors: [],
            taxClass: {
              id: "tax-class-1",
              name: "Standard Rate",
              countries: [
                { country: { code: "US" }, rate: 8.5 },
                { country: { code: "GB" }, rate: 20 },
              ],
            },
          },
        },
        error: undefined,
      };

      vi.mocked(mockClient.mutation).mockResolvedValue(mockResponse);

      const result = await repository.createTaxClass(input);

      expect(result).toEqual({
        id: "tax-class-1",
        name: "Standard Rate",
        countryRates: [
          { countryCode: "US", rate: 8.5 },
          { countryCode: "GB", rate: 20 },
        ],
      });
    });

    it("should throw error when creation fails", async () => {
      const input = { name: "Standard Rate" };

      const mockResponse = {
        data: {
          taxClassCreate: {
            errors: [{ field: "name", message: "Name already exists" }],
            taxClass: null,
          },
        },
        error: undefined,
      };

      vi.mocked(mockClient.mutation).mockResolvedValue(mockResponse);

      await expect(repository.createTaxClass(input)).rejects.toThrow(
        "Failed to create tax class: Name already exists"
      );
    });
  });

  describe("updateTaxClass", () => {
    it("should update a tax class successfully", async () => {
      const id = "tax-class-1";
      const input = {
        name: "Updated Rate",
        updateCountryRates: [{ countryCode: "US" as const, rate: 10 }],
      };

      const mockResponse = {
        data: {
          taxClassUpdate: {
            errors: [],
            taxClass: {
              id: "tax-class-1",
              name: "Updated Rate",
              countries: [{ country: { code: "US" }, rate: 10 }],
            },
          },
        },
        error: undefined,
      };

      vi.mocked(mockClient.mutation).mockResolvedValue(mockResponse);

      const result = await repository.updateTaxClass(id, input);

      expect(result).toEqual({
        id: "tax-class-1",
        name: "Updated Rate",
        countryRates: [{ countryCode: "US", rate: 10 }],
      });
    });
  });

  describe("deleteTaxClass", () => {
    it("should delete a tax class successfully", async () => {
      const id = "tax-class-1";

      const mockResponse = {
        data: {
          taxClassDelete: {
            errors: [],
            taxClass: { id: "tax-class-1", name: "Standard Rate" },
          },
        },
        error: undefined,
      };

      vi.mocked(mockClient.mutation).mockResolvedValue(mockResponse);

      await expect(repository.deleteTaxClass(id)).resolves.not.toThrow();
    });

    it("should throw error when deletion fails", async () => {
      const id = "tax-class-1";

      const mockResponse = {
        data: {
          taxClassDelete: {
            errors: [{ field: "id", message: "Tax class is in use" }],
            taxClass: null,
          },
        },
        error: undefined,
      };

      vi.mocked(mockClient.mutation).mockResolvedValue(mockResponse);

      await expect(repository.deleteTaxClass(id)).rejects.toThrow(
        "Failed to delete tax class: Tax class is in use"
      );
    });
  });

  describe("getAllTaxConfigurations", () => {
    it("should return all tax configurations", async () => {
      const mockResponse = {
        data: {
          taxConfigurations: {
            edges: [
              {
                node: {
                  id: "config-1",
                  channel: { id: "channel-1", slug: "default", name: "Default" },
                  chargeTaxes: true,
                  displayGrossPrices: true,
                  pricesEnteredWithTax: true,
                  taxCalculationStrategy: "FLAT_RATES",
                  taxAppId: null,
                },
              },
            ],
          },
        },
        error: undefined,
      };

      vi.mocked(mockClient.query).mockResolvedValue(mockResponse);

      const result = await repository.getAllTaxConfigurations();

      expect(result).toEqual([
        {
          id: "config-1",
          channelId: "channel-1",
          channelSlug: "default",
          channelName: "Default",
          chargeTaxes: true,
          displayGrossPrices: true,
          pricesEnteredWithTax: true,
          taxCalculationStrategy: "FLAT_RATES",
          taxAppId: null,
        },
      ]);
    });
  });

  describe("updateTaxConfiguration", () => {
    it("should update tax configuration successfully", async () => {
      const id = "config-1";
      const input = {
        chargeTaxes: false,
        taxCalculationStrategy: "TAX_APP" as const,
        taxAppId: "saleor.tax",
      };

      const mockResponse = {
        data: {
          taxConfigurationUpdate: {
            errors: [],
            taxConfiguration: {
              id: "config-1",
              channel: { id: "channel-1", slug: "default", name: "Default" },
              chargeTaxes: false,
              displayGrossPrices: true,
              pricesEnteredWithTax: true,
              taxCalculationStrategy: "TAX_APP",
              taxAppId: "saleor.tax",
            },
          },
        },
        error: undefined,
      };

      vi.mocked(mockClient.mutation).mockResolvedValue(mockResponse);

      const result = await repository.updateTaxConfiguration(id, input);

      expect(result.chargeTaxes).toBe(false);
      expect(result.taxCalculationStrategy).toBe("TAX_APP");
      expect(result.taxAppId).toBe("saleor.tax");
    });
  });

  describe("updateTaxCountryConfiguration", () => {
    it("should update tax country configuration successfully", async () => {
      const countryCode = "US" as const;
      const updateTaxClassRates = [{ taxClassId: "tax-class-1", rate: 9.0 }];

      const mockResponse = {
        data: {
          taxCountryConfigurationUpdate: {
            errors: [],
            taxCountryConfiguration: {
              country: { code: "US", country: "United States" },
              taxClassCountryRates: [
                {
                  rate: 9.0,
                  taxClass: { id: "tax-class-1", name: "Standard Rate" },
                },
              ],
            },
          },
        },
        error: undefined,
      };

      vi.mocked(mockClient.mutation).mockResolvedValue(mockResponse);

      await expect(
        repository.updateTaxCountryConfiguration(countryCode, updateTaxClassRates)
      ).resolves.not.toThrow();
    });

    it("should throw error when update fails", async () => {
      const countryCode = "US" as const;
      const updateTaxClassRates = [{ taxClassId: "invalid", rate: 9.0 }];

      const mockResponse = {
        data: {
          taxCountryConfigurationUpdate: {
            errors: [{ field: "taxClassId", message: "Tax class not found" }],
            taxCountryConfiguration: null,
          },
        },
        error: undefined,
      };

      vi.mocked(mockClient.mutation).mockResolvedValue(mockResponse);

      await expect(
        repository.updateTaxCountryConfiguration(countryCode, updateTaxClassRates)
      ).rejects.toThrow("Failed to update tax country configuration: Tax class not found");
    });
  });
});
