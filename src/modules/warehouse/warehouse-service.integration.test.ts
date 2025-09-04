import { describe, expect, it, vi } from "vitest";
import type { WarehouseInput } from "../config/schema/schema";
import type { WarehouseOperations } from "./repository";
import { WarehouseService } from "./warehouse-service";

describe("WarehouseService - Two-Step Creation", () => {
  it("should create warehouse with two-step process when isPrivate or clickAndCollectOption is set", async () => {
    const mockRepository: WarehouseOperations = {
      getWarehouses: vi.fn().mockResolvedValue([]),
      getWarehouse: vi.fn(),
      createWarehouse: vi.fn().mockResolvedValue({
        id: "w1",
        name: "Test Warehouse",
        slug: "test-warehouse",
        email: "test@example.com",
        isPrivate: false,
        clickAndCollectOption: "DISABLED",
        address: { city: "TEST CITY" },
      }),
      updateWarehouse: vi.fn().mockResolvedValue({
        id: "w1",
        name: "Test Warehouse",
        slug: "test-warehouse",
        email: "test@example.com",
        isPrivate: true,
        clickAndCollectOption: "LOCAL",
        address: { city: "TEST CITY" },
      }),
      assignShippingZones: vi.fn(),
      unassignShippingZones: vi.fn(),
    };

    const service = new WarehouseService(mockRepository);

    const input: WarehouseInput = {
      name: "Test Warehouse",
      slug: "test-warehouse",
      email: "test@example.com",
      isPrivate: true,
      clickAndCollectOption: "LOCAL",
      address: {
        streetAddress1: "123 Test St",
        city: "Test City",
        country: "US",
      },
    };

    await service.createWarehouse(input);

    // Verify two-step process was used
    expect(mockRepository.createWarehouse).toHaveBeenCalledTimes(1);
    expect(mockRepository.updateWarehouse).toHaveBeenCalledTimes(1);

    // Verify create was called without isPrivate/clickAndCollectOption
    const createCall = vi.mocked(mockRepository.createWarehouse).mock.calls[0][0];
    expect(createCall).not.toHaveProperty("isPrivate");
    expect(createCall).not.toHaveProperty("clickAndCollectOption");

    // Verify update was called with these fields
    const updateCall = vi.mocked(mockRepository.updateWarehouse).mock.calls[0][1];
    expect(updateCall.isPrivate).toBe(true);
    expect(updateCall.clickAndCollectOption).toBe("LOCAL");
  });

  it("should handle API validation error for private warehouse with click&collect", async () => {
    const mockRepository: WarehouseOperations = {
      getWarehouses: vi.fn().mockResolvedValue([]),
      getWarehouse: vi.fn(),
      createWarehouse: vi.fn().mockResolvedValue({
        id: "w1",
        name: "Test Warehouse",
        slug: "test-warehouse",
      }),
      updateWarehouse: vi
        .fn()
        .mockRejectedValue(
          new Error(
            "[clickAndCollectOption] Local warehouse can be toggled only for non-private warehouse stocks"
          )
        ),
      assignShippingZones: vi.fn(),
      unassignShippingZones: vi.fn(),
    };

    const service = new WarehouseService(mockRepository);

    const input: WarehouseInput = {
      name: "Test Warehouse",
      slug: "test-warehouse",
      email: "test@example.com",
      isPrivate: true,
      clickAndCollectOption: "LOCAL", // Invalid combination
      address: {
        streetAddress1: "123 Test St",
        city: "Test City",
        country: "US",
      },
    };

    await expect(service.createWarehouse(input)).rejects.toThrow(
      "Local warehouse can be toggled only for non-private warehouse stocks"
    );
  });

  it("should skip update step when neither isPrivate nor clickAndCollectOption is set", async () => {
    const mockRepository: WarehouseOperations = {
      getWarehouses: vi.fn().mockResolvedValue([]),
      getWarehouse: vi.fn(),
      createWarehouse: vi.fn().mockResolvedValue({
        id: "w1",
        name: "Test Warehouse",
        slug: "test-warehouse",
        email: "test@example.com",
        isPrivate: false,
        clickAndCollectOption: "DISABLED",
        address: {
          streetAddress1: "123 Test St",
          streetAddress2: "",
          city: "Test City",
          cityArea: "",
          postalCode: "",
          country: { code: "US", country: "United States" },
          countryArea: "",
          companyName: "Test Company",
          phone: null,
        },
        companyName: "Test Company",
        shippingZones: { edges: [] },
      }),
      updateWarehouse: vi.fn(),
      assignShippingZones: vi.fn(),
      unassignShippingZones: vi.fn(),
    };

    const service = new WarehouseService(mockRepository);

    const input: WarehouseInput = {
      name: "Test Warehouse",
      slug: "test-warehouse",
      email: "test@example.com",
      // isPrivate and clickAndCollectOption are intentionally not set (undefined)
      address: {
        streetAddress1: "123 Test St",
        city: "Test City",
        country: "US",
      },
    };

    await service.createWarehouse(input);

    // Verify only create was called, not update
    expect(mockRepository.createWarehouse).toHaveBeenCalledTimes(1);
    expect(mockRepository.updateWarehouse).not.toHaveBeenCalled();
  });
});
