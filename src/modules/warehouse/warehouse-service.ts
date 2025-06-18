import type { SaleorConfig } from "../config/schema";
import { logger } from "../../lib/logger";
import { object } from "../../lib/utils/object";
import type { WarehouseOperations, Warehouse, WarehouseCreateInput } from "./repository";

type WarehouseInput = NonNullable<SaleorConfig["warehouses"]>[number];

export class WarehouseService {
  constructor(private repository: WarehouseOperations) {}

  async upsertWarehouses(warehouses: NonNullable<SaleorConfig["warehouses"]>) {
    for (const warehouse of warehouses) {
      await this.upsertWarehouse(warehouse);
    }
  }

  private async upsertWarehouse(input: WarehouseInput) {
    const existing = await this.repository.getWarehouseBySlug(input.slug);

    if (existing) {
      await this.updateWarehouse(existing.id, input);
    } else {
      await this.createWarehouse(input);
    }
  }

  private async createWarehouse(input: WarehouseInput) {
    logger.info(`Creating warehouse: ${input.name}`);

    const createInput: WarehouseCreateInput = {
      name: input.name,
      slug: input.slug,
      email: input.email,
      address: {
        streetAddress1: input.address.streetAddress1,
        streetAddress2: input.address.streetAddress2 || "",
        city: input.address.city,
        cityArea: input.address.cityArea || "",
        postalCode: input.address.postalCode,
        country: input.address.country,
        countryArea: input.address.countryArea || "",
        phone: input.address.phone || "",
      },
    };

    return this.repository.createWarehouse(createInput);
  }

  private async updateWarehouse(id: string, input: WarehouseInput) {
    logger.info(`Updating warehouse: ${input.name}`);

    const updateInput = {
      name: input.name,
      email: input.email,
      address: {
        streetAddress1: input.address.streetAddress1,
        streetAddress2: input.address.streetAddress2 || "",
        city: input.address.city,
        cityArea: input.address.cityArea || "",
        postalCode: input.address.postalCode,
        country: input.address.country,
        countryArea: input.address.countryArea || "",
        phone: input.address.phone || "",
      },
    };

    return this.repository.updateWarehouse(id, updateInput);
  }
} 