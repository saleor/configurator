import { logger } from "../../lib/logger";
import { DelayConfig } from "../../lib/utils/bulk-operation-constants";
import { processInChunks } from "../../lib/utils/chunked-processor";
import type { AttributeCache } from "../attribute/attribute-cache";
import { isReferencedAttribute, validateAttributeReference } from "../attribute/attribute-service";
import type { CustomerTypeInput } from "../config/schema/schema";
import { CustomerTypeOperationError, CustomerTypeValidationError } from "./errors";
import type { CustomerType, CustomerTypeOperations, CustomerTypeUpdateInput } from "./repository";

export interface BootstrapCustomerTypeOptions {
  attributeCache?: AttributeCache;
}

export class CustomerTypeService {
  constructor(private repository: CustomerTypeOperations) {}

  /**
   * Resolves `{ attribute: "Name" }` references to attribute IDs via the cache
   * populated by the attributes stage. Attributes already assigned are skipped.
   */
  private resolveReferencedAttributes(
    input: CustomerTypeInput,
    assignedNames: ReadonlySet<string>,
    attributeCache: AttributeCache | undefined
  ): string[] {
    const referenced = (input.attributes ?? []).filter(isReferencedAttribute);
    const inline = (input.attributes ?? []).filter((attr) => !isReferencedAttribute(attr));

    if (inline.length > 0) {
      throw new CustomerTypeValidationError(
        `Customer type "${input.slug}" defines attributes inline. ` +
          `Define them in the customerAttributes section and reference them by name instead.`
      );
    }

    const namesToResolve = referenced
      .map((attr) => attr.attribute)
      .filter((name) => !assignedNames.has(name));

    if (namesToResolve.length === 0) return [];

    if (!attributeCache) {
      throw new CustomerTypeValidationError(
        `Cannot resolve attribute references for customer type "${input.slug}" without attribute cache. ` +
          `Ensure the attributes stage completed successfully.`
      );
    }

    return namesToResolve.map((name) => {
      const result = validateAttributeReference(
        name,
        "customer",
        "customerTypes",
        input.name,
        attributeCache
      );
      if (!result.valid) throw result.error;
      return result.attribute.id;
    });
  }

  private toUpdateInput(input: CustomerTypeInput): CustomerTypeUpdateInput {
    return {
      name: input.name,
      slug: input.slug,
      isDefault: input.isDefault,
    };
  }

  private hasChanges(existing: CustomerType, input: CustomerTypeInput): boolean {
    return existing.name !== input.name || existing.isDefault !== input.isDefault;
  }

  private async getOrCreate(
    input: CustomerTypeInput,
    existing: CustomerType | undefined
  ): Promise<CustomerType> {
    if (!existing) {
      logger.debug("Creating customer type", { slug: input.slug });
      return this.repository.createCustomerType(this.toUpdateInput(input));
    }

    if (!this.hasChanges(existing, input)) {
      logger.debug("Customer type is up to date", { slug: input.slug });
      return existing;
    }

    logger.debug("Updating customer type", { slug: input.slug, id: existing.id });
    return this.repository.updateCustomerType(existing.id, this.toUpdateInput(input));
  }

  private async bootstrapCustomerType(
    input: CustomerTypeInput,
    existing: CustomerType | undefined,
    options?: BootstrapCustomerTypeOptions
  ): Promise<CustomerType> {
    const customerType = await this.getOrCreate(input, existing);

    const assignedNames = new Set(
      (customerType.attributes ?? [])
        .map((attr) => attr.name)
        .filter((name): name is string => typeof name === "string")
    );

    const attributeIds = this.resolveReferencedAttributes(
      input,
      assignedNames,
      options?.attributeCache
    );

    if (attributeIds.length > 0) {
      logger.debug("Assigning attributes to customer type", {
        slug: input.slug,
        attributeCount: attributeIds.length,
      });
      await this.repository.assignAttributes(customerType.id, attributeIds);
    }

    return customerType;
  }

  async bootstrapCustomerTypes(
    inputs: CustomerTypeInput[],
    options?: BootstrapCustomerTypeOptions
  ): Promise<CustomerType[]> {
    logger.debug("Bootstrapping customer types", { count: inputs.length });

    this.validateUniqueSlugs(inputs);

    // Fetched once: a per-item lookup would re-fetch the full list for every input.
    const existingBySlug = new Map(
      (await this.repository.getCustomerTypes()).map((customerType) => [
        customerType.slug,
        customerType,
      ])
    );

    const { successes, failures } = await processInChunks(
      inputs,
      async (chunk) =>
        Promise.all(
          chunk.map((input) =>
            this.bootstrapCustomerType(input, existingBySlug.get(input.slug), options)
          )
        ),
      {
        chunkSize: 10,
        delayMs: DelayConfig.DEFAULT_CHUNK_DELAY_MS,
        entityType: "customer types",
      }
    );

    if (failures.length > 0) {
      const reason = failures.map((f) => `${f.item.slug}: ${f.error.message}`).join("; ");
      logger.error(`Failed to bootstrap ${failures.length} of ${inputs.length} customer types`, {
        failures: reason,
      });
      throw new CustomerTypeOperationError("bootstrap", "customer types", reason);
    }

    logger.debug("Successfully bootstrapped all customer types", { count: successes.length });

    return successes.flatMap((s) => (Array.isArray(s.result) ? s.result : [s.result]));
  }

  private validateUniqueSlugs(inputs: CustomerTypeInput[]): void {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const input of inputs) {
      if (seen.has(input.slug)) duplicates.add(input.slug);
      seen.add(input.slug);
    }

    if (duplicates.size > 0) {
      throw new CustomerTypeValidationError(
        `Duplicate customer type slugs found: ${Array.from(duplicates).join(", ")}`
      );
    }
  }
}
