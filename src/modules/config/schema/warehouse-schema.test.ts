import { describe, expect, it } from "vitest";
import { configSchema } from "./schema";

describe("Warehouse Schema Validation", () => {
  it("should accept weight value of 0 in shipping methods", () => {
    const config = {
      shippingZones: [
        {
          name: "Test Zone",
          countries: ["US"],
          shippingMethods: [
            {
              name: "Free Shipping",
              type: "WEIGHT",
              minimumOrderWeight: {
                unit: "KG",
                value: 0, // This should be valid
              },
            },
          ],
        },
      ],
    };

    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should reject negative weight values", () => {
    const config = {
      shippingZones: [
        {
          name: "Test Zone",
          countries: ["US"],
          shippingMethods: [
            {
              name: "Invalid Shipping",
              type: "WEIGHT",
              minimumOrderWeight: {
                unit: "KG",
                value: -1, // This should be invalid
              },
            },
          ],
        },
      ],
    };

    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(">=0");
  });

  it("should validate warehouse email format", () => {
    const invalidConfig = {
      warehouses: [
        {
          name: "Test Warehouse",
          slug: "test-warehouse",
          email: "invalid-email", // Invalid email
          address: {
            streetAddress1: "123 Test St",
            city: "Test City",
            country: "US",
          },
        },
      ],
    };

    const result = configSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("email");
  });

  it("should accept valid warehouse with all fields", () => {
    const config = {
      warehouses: [
        {
          name: "Test Warehouse",
          slug: "test-warehouse",
          email: "warehouse@example.com",
          isPrivate: true,
          clickAndCollectOption: "LOCAL",
          address: {
            streetAddress1: "123 Test St",
            city: "Test City",
            postalCode: "12345",
            country: "US",
            countryArea: "CA",
          },
          shippingZones: ["zone-1"],
        },
      ],
    };

    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});