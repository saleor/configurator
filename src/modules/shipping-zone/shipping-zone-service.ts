import { logger } from "../../lib/logger";
import { object } from "../../lib/utils/object";
import type { ShippingMethodInput, ShippingZoneInput } from "../config/schema/schema";
import {
  ShippingMethodValidationError,
  ShippingZoneOperationError,
  ShippingZoneValidationError,
} from "./errors";
import type {
  ShippingMethod,
  ShippingPriceInput,
  ShippingZone,
  ShippingZoneCreateInput,
  ShippingZoneOperations,
  ShippingZoneUpdateInput,
} from "./repository";

export class ShippingZoneService {
  constructor(private repository: ShippingZoneOperations) {}

  private async getExistingShippingZone(name: string): Promise<ShippingZone | undefined> {
    logger.debug("Looking up existing shipping zone", { name });
    const shippingZones = await this.repository.getShippingZones();
    const existingZone = shippingZones.find((zone) => zone.name === name);

    if (existingZone) {
      logger.debug("Found existing shipping zone", {
        id: existingZone.id,
        name: existingZone.name,
      });
    } else {
      logger.debug("Shipping zone not found", { name });
    }

    return existingZone;
  }

  private validateShippingZoneInput(input: ShippingZoneInput): void {
    if (!input.name) {
      throw new ShippingZoneValidationError("Shipping zone name is required", "name");
    }
    if (!input.countries || input.countries.length === 0) {
      throw new ShippingZoneValidationError("At least one country is required", "countries");
    }
  }

  private validateShippingMethodInput(method: ShippingMethodInput): void {
    if (!method.name) {
      throw new ShippingMethodValidationError("Shipping method name is required", "name");
    }
    if (!method.type) {
      throw new ShippingMethodValidationError("Shipping method type is required", "type");
    }
    if (method.channelListings) {
      for (const listing of method.channelListings) {
        if (!listing.channel) {
          throw new ShippingMethodValidationError(
            "Channel is required for channel listing",
            "channelListings.channel"
          );
        }
        if (listing.price === undefined || listing.price === null || listing.price < 0) {
          throw new ShippingMethodValidationError(
            "Valid price is required for channel listing",
            "channelListings.price"
          );
        }
      }
    }
  }

  private mapInputToCreateInput(input: ShippingZoneInput): ShippingZoneCreateInput {
    return object.filterUndefinedValues({
      name: input.name,
      description: input.description,
      countries: input.countries,
      default: input.default,
      addWarehouses: input.warehouses,
      addChannels: input.channels,
    });
  }

  private mapInputToUpdateInput(input: ShippingZoneInput): ShippingZoneUpdateInput {
    return object.filterUndefinedValues({
      name: input.name,
      description: input.description,
      countries: input.countries,
      default: input.default,
      addWarehouses: input.warehouses,
      removeWarehouses: [], // Will be handled separately
      addChannels: input.channels,
      removeChannels: [], // Will be handled separately
    });
  }

  private mapShippingMethodToCreateInput(
    method: ShippingMethodInput,
    shippingZoneId: string
  ): ShippingPriceInput {
    const baseInput = {
      name: method.name,
      description: method.description,
      type: method.type,
      shippingZone: shippingZoneId,
      maximumDeliveryDays: method.maximumDeliveryDays,
      minimumDeliveryDays: method.minimumDeliveryDays,
      maximumOrderWeight: method.maximumOrderWeight,
      minimumOrderWeight: method.minimumOrderWeight,
      taxClass: method.taxClass,
    };

    // If there are channel listings, we'll need to handle them separately
    return object.filterUndefinedValues(baseInput);
  }

  async createShippingZone(input: ShippingZoneInput): Promise<ShippingZone> {
    logger.debug("Creating new shipping zone", { name: input.name });
    this.validateShippingZoneInput(input);

    // Validate shipping methods before attempting to create the zone
    if (input.shippingMethods) {
      for (const method of input.shippingMethods) {
        this.validateShippingMethodInput(method);
      }
    }

    try {
      const createInput = this.mapInputToCreateInput(input);
      const shippingZone = await this.repository.createShippingZone(createInput);

      // Create shipping methods if provided
      if (input.shippingMethods && input.shippingMethods.length > 0) {
        await this.createShippingMethods(shippingZone.id, input.shippingMethods);
      }

      logger.debug("Successfully created shipping zone", {
        id: shippingZone.id,
        name: shippingZone.name,
      });
      return shippingZone;
    } catch (error) {
      // Re-throw validation errors without wrapping
      if (
        error instanceof ShippingZoneValidationError ||
        error instanceof ShippingMethodValidationError
      ) {
        throw error;
      }

      logger.error("Failed to create shipping zone", {
        error: error instanceof Error ? error.message : "Unknown error",
        name: input.name,
      });
      throw new ShippingZoneOperationError(
        "create",
        input.name,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async updateShippingZone(id: string, input: ShippingZoneInput): Promise<ShippingZone> {
    logger.debug("Updating shipping zone", { id, name: input.name });

    try {
      const updateInput = this.mapInputToUpdateInput(input);
      const shippingZone = await this.repository.updateShippingZone(id, updateInput);

      // Update shipping methods if provided
      if (input.shippingMethods !== undefined) {
        await this.syncShippingMethods(
          shippingZone.id,
          input.shippingMethods,
          shippingZone.shippingMethods
        );
      }

      logger.debug("Successfully updated shipping zone", {
        id: shippingZone.id,
        name: shippingZone.name,
      });
      return shippingZone;
    } catch (error) {
      logger.error("Failed to update shipping zone", {
        error: error instanceof Error ? error.message : "Unknown error",
        id,
        name: input.name,
      });
      throw new ShippingZoneOperationError(
        "update",
        input.name,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async getOrCreateShippingZone(input: ShippingZoneInput): Promise<ShippingZone> {
    logger.debug("Getting or creating shipping zone", { name: input.name });
    this.validateShippingZoneInput(input);

    const existingZone = await this.getExistingShippingZone(input.name);

    if (existingZone) {
      logger.debug("Updating existing shipping zone", {
        id: existingZone.id,
        name: input.name,
      });
      return this.updateShippingZone(existingZone.id, input);
    }

    return this.createShippingZone(input);
  }

  private async createShippingMethods(
    shippingZoneId: string,
    methods: ShippingMethodInput[]
  ): Promise<void> {
    for (const method of methods) {
      const createInput = this.mapShippingMethodToCreateInput(method, shippingZoneId);
      const createdMethod = await this.repository.createShippingMethod(createInput);

      // Update channel listings if provided
      if (method.channelListings && method.channelListings.length > 0) {
        const channelListingInput = {
          addChannels: method.channelListings.map((listing) => ({
            channelId: listing.channel, // This should be resolved to ID from slug
            price: listing.price?.toString(),
            minimumOrderPrice: listing.minimumOrderPrice
              ? {
                  amount: listing.minimumOrderPrice,
                  currency: listing.currency || "USD",
                }
              : undefined,
            maximumOrderPrice: listing.maximumOrderPrice
              ? {
                  amount: listing.maximumOrderPrice,
                  currency: listing.currency || "USD",
                }
              : undefined,
          })),
        };
        await this.repository.updateShippingMethodChannelListing(
          createdMethod.id,
          channelListingInput
        );
      }
    }
  }

  protected async syncShippingMethods(
    shippingZoneId: string,
    desiredMethods: ShippingMethodInput[],
    currentMethods: ShippingMethod[]
  ): Promise<void> {
    // Create a map of current methods by name for easy lookup
    const currentMethodsMap = new Map(currentMethods.map((m) => [m.name, m]));
    const desiredMethodNames = new Set(desiredMethods.map((m) => m.name));

    // Delete methods that are no longer desired
    for (const currentMethod of currentMethods) {
      if (!desiredMethodNames.has(currentMethod.name)) {
        logger.debug("Deleting shipping method", {
          id: currentMethod.id,
          name: currentMethod.name,
        });
        await this.repository.deleteShippingMethod(currentMethod.id);
      }
    }

    // Create or update methods
    for (const desiredMethod of desiredMethods) {
      this.validateShippingMethodInput(desiredMethod);
      const currentMethod = currentMethodsMap.get(desiredMethod.name);

      if (currentMethod) {
        // Update existing method
        logger.debug("Updating shipping method", {
          id: currentMethod.id,
          name: desiredMethod.name,
        });
        const updateInput = this.mapShippingMethodToCreateInput(desiredMethod, shippingZoneId);
        await this.repository.updateShippingMethod(currentMethod.id, updateInput);

        // Update channel listings if provided
        if (desiredMethod.channelListings) {
          const channelListingInput = {
            addChannels: desiredMethod.channelListings.map((listing) => ({
              channelId: listing.channel, // This should be resolved to ID from slug
              price: listing.price?.toString(),
              minimumOrderPrice: listing.minimumOrderPrice
                ? {
                    amount: listing.minimumOrderPrice,
                    currency: listing.currency || "USD",
                  }
                : undefined,
              maximumOrderPrice: listing.maximumOrderPrice
                ? {
                    amount: listing.maximumOrderPrice,
                    currency: listing.currency || "USD",
                  }
                : undefined,
            })),
          };
          await this.repository.updateShippingMethodChannelListing(
            currentMethod.id,
            channelListingInput
          );
        }
      } else {
        // Create new method
        logger.debug("Creating shipping method", { name: desiredMethod.name });
        const createInput = this.mapShippingMethodToCreateInput(desiredMethod, shippingZoneId);
        const createdMethod = await this.repository.createShippingMethod(createInput);

        // Update channel listings if provided
        if (desiredMethod.channelListings && desiredMethod.channelListings.length > 0) {
          const channelListingInput = {
            addChannels: desiredMethod.channelListings.map((listing) => ({
              channelId: listing.channel, // This should be resolved to ID from slug
              price: listing.price?.toString(),
              minimumOrderPrice: listing.minimumOrderPrice
                ? {
                    amount: listing.minimumOrderPrice,
                    currency: listing.currency || "USD",
                  }
                : undefined,
              maximumOrderPrice: listing.maximumOrderPrice
                ? {
                    amount: listing.maximumOrderPrice,
                    currency: listing.currency || "USD",
                  }
                : undefined,
            })),
          };
          await this.repository.updateShippingMethodChannelListing(
            createdMethod.id,
            channelListingInput
          );
        }
      }
    }
  }

  async bootstrapShippingZones(inputs: ShippingZoneInput[]): Promise<ShippingZone[]> {
    logger.debug("Bootstrapping shipping zones", { count: inputs.length });

    // Validate unique names
    const names = new Set<string>();
    const duplicateNames = new Set<string>();

    for (const input of inputs) {
      if (names.has(input.name)) {
        duplicateNames.add(input.name);
      }
      names.add(input.name);
    }

    if (duplicateNames.size > 0) {
      throw new ShippingZoneValidationError(
        `Duplicate shipping zone names found: ${Array.from(duplicateNames).join(", ")}`
      );
    }

    try {
      const shippingZones = await Promise.all(
        inputs.map((input) => this.getOrCreateShippingZone(input))
      );
      logger.debug("Successfully bootstrapped all shipping zones", {
        count: shippingZones.length,
      });
      return shippingZones;
    } catch (error) {
      logger.error("Failed to bootstrap shipping zones", {
        error: error instanceof Error ? error.message : "Unknown error",
        count: inputs.length,
      });
      throw error;
    }
  }
}
