import { logger } from "../../lib/logger";
import { object } from "../../lib/utils/object";
import type { WarehouseInput } from "../config/schema/schema";
import { WarehouseOperationError, WarehouseValidationError } from "./errors";
import type {
  Warehouse,
  WarehouseCreateInput,
  WarehouseOperations,
  WarehouseUpdateInput,
} from "./repository";

export class WarehouseService {
  constructor(private repository: WarehouseOperations) {}

  private async getExistingWarehouse(slug: string): Promise<Warehouse | undefined> {
    logger.debug("Looking up existing warehouse", { slug });
    const warehouses = await this.repository.getWarehouses();
    const existingWarehouse = warehouses.find((warehouse) => warehouse.slug === slug);

    if (existingWarehouse) {
      logger.debug("Found existing warehouse", {
        id: existingWarehouse.id,
        name: existingWarehouse.name,
        slug: existingWarehouse.slug,
      });
    } else {
      logger.debug("Warehouse not found", { slug });
    }

    return existingWarehouse;
  }

  private validateWarehouseInput(input: WarehouseInput): void {
    if (!input.slug?.trim()) {
      throw new WarehouseValidationError("Warehouse slug is required", "slug");
    }
    if (!input.name?.trim()) {
      throw new WarehouseValidationError("Warehouse name is required", "name");
    }
    if (!input.email?.trim()) {
      throw new WarehouseValidationError("Warehouse email is required", "email");
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      throw new WarehouseValidationError("Warehouse email is invalid", "email");
    }
    if (!input.address) {
      throw new WarehouseValidationError("Warehouse address is required", "address");
    }
    if (!input.address.streetAddress1?.trim()) {
      throw new WarehouseValidationError(
        "Warehouse street address is required",
        "address.streetAddress1"
      );
    }
    if (!input.address.city?.trim()) {
      throw new WarehouseValidationError("Warehouse city is required", "address.city");
    }
    if (!input.address.country?.trim()) {
      throw new WarehouseValidationError("Warehouse country is required", "address.country");
    }
  }

  private mapInputToCreateInput(input: WarehouseInput): WarehouseCreateInput {
    return object.filterUndefinedValues({
      name: input.name,
      slug: input.slug,
      email: input.email,
      address: {
        streetAddress1: input.address.streetAddress1,
        streetAddress2: input.address.streetAddress2,
        city: input.address.city,
        cityArea: input.address.cityArea,
        postalCode: input.address.postalCode,
        country: input.address.country,
        countryArea: input.address.countryArea,
        companyName: input.address.companyName,
        phone: input.address.phone,
      },
      // Note: isPrivate and clickAndCollectOption are not supported in warehouse creation
      // These fields can only be updated after creation or are set via other mutations
    });
  }

  private mapInputToUpdateInput(input: WarehouseInput): WarehouseUpdateInput {
    return object.filterUndefinedValues({
      name: input.name,
      slug: input.slug,
      email: input.email,
      address: input.address
        ? {
            streetAddress1: input.address.streetAddress1,
            streetAddress2: input.address.streetAddress2,
            city: input.address.city,
            cityArea: input.address.cityArea,
            postalCode: input.address.postalCode,
            country: input.address.country,
            countryArea: input.address.countryArea,
            companyName: input.address.companyName,
            phone: input.address.phone,
          }
        : undefined,
      isPrivate: input.isPrivate,
      clickAndCollectOption: input.clickAndCollectOption,
    });
  }

  async createWarehouse(input: WarehouseInput): Promise<Warehouse> {
    logger.debug("Creating new warehouse", { name: input.name, slug: input.slug });
    this.validateWarehouseInput(input);

    try {
      const createInput = this.mapInputToCreateInput(input);
      let warehouse = await this.repository.createWarehouse(createInput);

      // Check if we need to update additional fields that aren't supported in creation
      const needsUpdate =
        input.isPrivate !== undefined || input.clickAndCollectOption !== undefined;

      if (needsUpdate) {
        logger.debug("Updating warehouse with additional fields after creation", {
          id: warehouse.id,
          isPrivate: input.isPrivate,
          clickAndCollectOption: input.clickAndCollectOption,
        });

        const updateInput = this.mapInputToUpdateInput(input);
        warehouse = await this.repository.updateWarehouse(warehouse.id, updateInput);
      }

      logger.debug("Successfully created warehouse", {
        id: warehouse.id,
        name: warehouse.name,
        slug: warehouse.slug,
      });
      return warehouse;
    } catch (error) {
      // Re-throw validation errors without wrapping
      if (error instanceof WarehouseValidationError) {
        throw error;
      }

      logger.error("Failed to create warehouse", {
        error: error instanceof Error ? error.message : "Unknown error",
        name: input.name,
        slug: input.slug,
      });
      throw new WarehouseOperationError(
        "create",
        input.name,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async updateWarehouse(id: string, input: WarehouseInput): Promise<Warehouse> {
    logger.debug("Updating warehouse", { id, name: input.name, slug: input.slug });

    try {
      const updateInput = this.mapInputToUpdateInput(input);
      logger.debug("Warehouse update input", {
        id,
        updateInput: JSON.stringify(updateInput, null, 2),
        originalInput: JSON.stringify(input, null, 2),
      });

      const warehouse = await this.repository.updateWarehouse(id, updateInput);

      logger.debug("Successfully updated warehouse", {
        id: warehouse.id,
        name: warehouse.name,
        slug: warehouse.slug,
        returnedCity: warehouse.address?.city,
        inputCity: input.address?.city,
      });
      return warehouse;
    } catch (error) {
      logger.error("Failed to update warehouse", {
        error: error instanceof Error ? error.message : "Unknown error",
        id,
        name: input.name,
      });
      throw new WarehouseOperationError(
        "update",
        input.name,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async getOrCreateWarehouse(input: WarehouseInput): Promise<Warehouse> {
    logger.debug("Getting or creating warehouse", { name: input.name, slug: input.slug });
    this.validateWarehouseInput(input);

    const existingWarehouse = await this.getExistingWarehouse(input.slug);

    if (existingWarehouse) {
      logger.debug("Updating existing warehouse", {
        id: existingWarehouse.id,
        name: input.name,
        slug: input.slug,
      });
      return this.updateWarehouse(existingWarehouse.id, input);
    }

    return this.createWarehouse(input);
  }

  async bootstrapWarehouses(inputs: WarehouseInput[]): Promise<Warehouse[]> {
    logger.debug("Bootstrapping warehouses", { count: inputs.length });

    // Validate unique slugs
    const slugs = new Set<string>();
    const duplicateSlugs = new Set<string>();

    for (const input of inputs) {
      if (slugs.has(input.slug)) {
        duplicateSlugs.add(input.slug);
      }
      slugs.add(input.slug);
    }

    if (duplicateSlugs.size > 0) {
      throw new WarehouseValidationError(
        `Duplicate warehouse slugs found: ${Array.from(duplicateSlugs).join(", ")}`
      );
    }

    try {
      const warehouses = await Promise.all(inputs.map((input) => this.getOrCreateWarehouse(input)));
      logger.debug("Successfully bootstrapped all warehouses", {
        count: warehouses.length,
      });
      return warehouses;
    } catch (error) {
      logger.error("Failed to bootstrap warehouses", {
        error: error instanceof Error ? error.message : "Unknown error",
        count: inputs.length,
      });
      throw error;
    }
  }

  async syncWarehouseShippingZones(
    warehouseId: string,
    desiredShippingZoneIds: string[],
    currentShippingZoneIds: string[]
  ): Promise<void> {
    const toAssign = desiredShippingZoneIds.filter((id) => !currentShippingZoneIds.includes(id));
    const toUnassign = currentShippingZoneIds.filter((id) => !desiredShippingZoneIds.includes(id));

    if (toAssign.length > 0) {
      logger.debug("Assigning shipping zones to warehouse", {
        warehouseId,
        shippingZoneIds: toAssign,
      });
      await this.repository.assignShippingZones(warehouseId, toAssign);
    }

    if (toUnassign.length > 0) {
      logger.debug("Unassigning shipping zones from warehouse", {
        warehouseId,
        shippingZoneIds: toUnassign,
      });
      await this.repository.unassignShippingZones(warehouseId, toUnassign);
    }
  }
}
