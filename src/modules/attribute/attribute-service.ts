import {
  AttributeNotFoundError,
  findSimilarNames,
  WrongAttributeTypeError,
} from "../../lib/errors/validation-errors";
import { logger } from "../../lib/logger";
import { toSlug } from "../../lib/utils/string";
import type { AttributeInput, FullAttribute } from "../config/schema/attribute.schema";
import type { AttributeCache, CachedAttribute } from "./attribute-cache";
import { AttributeValidationError } from "./errors";
import type {
  Attribute,
  AttributeCreateInput,
  AttributeOperations,
  AttributeUpdateInput,
} from "./repository";

// Type guard to check if an attribute input is a reference
export function isReferencedAttribute(input: AttributeInput): input is { attribute: string } {
  return "attribute" in input && !("name" in input);
}

export const createAttributeInput = (input: FullAttribute): AttributeCreateInput => {
  const base = {
    name: input.name,
    type: input.type,
    slug: toSlug(input.name),
    inputType: input.inputType,
  };

  if (input.inputType === "REFERENCE") {
    if (!input.entityType) {
      throw new AttributeValidationError(
        `Entity type is required for reference attribute ${input.name}`
      );
    }

    return {
      ...base,
      entityType: input.entityType,
    };
  }

  if ("values" in input && input.values) {
    return {
      ...base,
      values: input.values.map((value) => ({
        name: value.name,
      })),
    };
  }

  return base;
};

const createAttributeUpdateInput = (
  input: FullAttribute,
  existingAttribute: Attribute
): AttributeUpdateInput => {
  const base: AttributeUpdateInput = {
    name: input.name,
  };

  // For attributes with values (dropdown, multiselect, swatch), compare and update values
  if ("values" in input && input.values) {
    const existingValues = existingAttribute.choices?.edges?.map((edge) => edge.node.name) || [];
    const newValues = input.values.map((v) => v.name);

    // Find values to add
    const valuesToAdd = newValues.filter((value) => !existingValues.includes(value));

    if (valuesToAdd.length > 0) {
      return {
        ...base,
        addValues: valuesToAdd.map((name) => ({ name })),
      };
    }
  }

  return base;
};

export class AttributeService {
  constructor(private repository: AttributeOperations) {}

  get repo() {
    return this.repository;
  }

  /**
   * Resolves referenced attributes by name and returns their IDs for assignment
   * @param inputAttributes - List of attribute inputs that may contain references
   * @param attributeType - The type of attributes to resolve (PRODUCT_TYPE or PAGE_TYPE)
   * @param existingAttributeNames - Names of attributes already assigned to prevent duplicate assignment
   * @returns Array of attribute IDs that should be assigned
   */
  async resolveReferencedAttributes(
    inputAttributes: AttributeInput[],
    attributeType: "PRODUCT_TYPE" | "PAGE_TYPE",
    existingAttributeNames: string[] = []
  ): Promise<string[]> {
    // Filter out attributes that are referenced by slug
    const referencedAttributes = inputAttributes.filter(isReferencedAttribute);

    if (referencedAttributes.length === 0) {
      return [];
    }

    logger.debug("Resolving referenced attributes", {
      count: referencedAttributes.length,
      type: attributeType,
    });

    // Get the names of referenced attributes
    const referencedAttributeNames = referencedAttributes.map((a) => a.attribute);

    // Filter out attributes that are already assigned
    const unassignedAttributeNames = referencedAttributeNames.filter(
      (name) => !existingAttributeNames.includes(name)
    );

    if (unassignedAttributeNames.length === 0) {
      logger.debug("All referenced attributes are already assigned");
      return [];
    }

    // Fetch the referenced attributes from the database
    const existingAttributes = await this.repository.getAttributesByNames({
      names: unassignedAttributeNames,
      type: attributeType,
    });

    if (existingAttributes.length === 0) {
      logger.warn("No referenced attributes found", {
        names: unassignedAttributeNames,
        type: attributeType,
      });
      return [];
    }

    const attributeIds = existingAttributes.map((attr) => attr.id);

    logger.debug("Resolved referenced attributes", {
      found: existingAttributes.length,
      requested: unassignedAttributeNames.length,
      attributeIds,
    });

    return attributeIds;
  }

  async bootstrapAttributes({ attributeInputs }: { attributeInputs: FullAttribute[] }) {
    logger.debug("Bootstrapping attributes", {
      count: attributeInputs.length,
    });

    const createdAttributes = await Promise.all(
      attributeInputs.map((attribute) => {
        const attributeInput = createAttributeInput(attribute);
        logger.debug("Creating attribute", { name: attributeInput.name });
        return this.repository.createAttribute(attributeInput);
      })
    );

    return createdAttributes;
  }

  async updateAttribute(attributeInput: FullAttribute, existingAttribute: Attribute) {
    logger.debug("Updating attribute", {
      name: attributeInput.name,
      id: existingAttribute.id,
    });

    const updateInput = createAttributeUpdateInput(attributeInput, existingAttribute);

    // Only update if there are actual changes
    if (Object.keys(updateInput).length > 1) {
      // More than just the name
      return this.repository.updateAttribute(existingAttribute.id, updateInput);
    }

    logger.debug("No changes detected for attribute", {
      name: attributeInput.name,
    });
    return existingAttribute;
  }

  /**
   * Create multiple attributes in bulk using Saleor's bulk mutation
   * @param attributes - Array of attributes to create
   * @returns Object containing successful and failed attributes
   */
  async bootstrapAttributesBulk(attributes: FullAttribute[]): Promise<{
    successful: Attribute[];
    failed: Array<{ input: FullAttribute; errors: string[] }>;
  }> {
    logger.info(`Creating ${attributes.length} attributes via bulk mutation`);

    // Convert all attributes to create input format
    const inputs = attributes.map(createAttributeInput);

    // Call bulk create with IGNORE_FAILED policy to allow partial success
    const result = await this.repository.bulkCreateAttributes({
      attributes: inputs,
      errorPolicy: "IGNORE_FAILED",
    });

    const successful: Attribute[] = [];
    const failed: Array<{ input: FullAttribute; errors: string[] }> = [];

    // Process results — use attribute name from result to match back to input
    // instead of relying on positional index alignment
    if (result.results) {
      result.results.forEach(({ attribute, errors }, index) => {
        if (errors && errors.length > 0) {
          // Try to find the original input by name from the result, fall back to index
          const failedInput =
            (attribute?.name ? attributes.find((a) => a.name === attribute.name) : undefined) ??
            attributes[index];
          if (failedInput) {
            failed.push({
              input: failedInput,
              errors: errors.map((e) => `${e.path || ""}: ${e.message}`),
            });
            logger.warn(`Failed to create attribute: ${failedInput.name}`, { errors });
          }
        } else if (attribute) {
          successful.push(attribute);
        } else {
          // No error and no attribute — unexpected empty result
          const input = attributes[index];
          if (input) {
            failed.push({
              input,
              errors: ["Attribute creation returned no result and no error"],
            });
            logger.warn(`Bulk create returned empty result for attribute: ${input.name}`);
          }
        }
      });
    }

    // Surface global errors as failures
    if (result.errors && result.errors.length > 0) {
      logger.warn("Global errors during bulk attribute creation", { errors: result.errors });
      for (const err of result.errors) {
        failed.push({
          input: attributes[0] ?? ({ name: "unknown" } as FullAttribute),
          errors: [`Global error: ${err.path || ""}: ${err.message}`],
        });
      }
    }

    logger.info(`Bulk create complete: ${successful.length} successful, ${failed.length} failed`);

    return { successful, failed };
  }

  /**
   * Update multiple attributes in bulk using Saleor's bulk mutation
   * @param updates - Array of objects containing the input and existing attribute to update
   * @returns Object containing successful and failed updates
   */
  async updateAttributesBulk(
    updates: Array<{ input: FullAttribute; existing: Attribute }>
  ): Promise<{
    successful: Attribute[];
    failed: Array<{ input: FullAttribute; errors: string[] }>;
  }> {
    logger.info(`Updating ${updates.length} attributes via bulk mutation`);

    // Convert all attributes to update input format
    const updateInputs = updates.map(({ input, existing }) => ({
      id: existing.id,
      fields: createAttributeUpdateInput(input, existing),
    }));

    // Filter out updates where there are no actual changes
    const actualUpdates = updateInputs.filter(
      (update) => Object.keys(update.fields).length > 1 // More than just the name
    );

    if (actualUpdates.length === 0) {
      logger.info("No attributes require updates");
      return { successful: updates.map((u) => u.existing), failed: [] };
    }

    // Call bulk update with IGNORE_FAILED policy
    const result = await this.repository.bulkUpdateAttributes({
      attributes: actualUpdates,
      errorPolicy: "IGNORE_FAILED",
    });

    const successful: Attribute[] = [];
    const failed: Array<{ input: FullAttribute; errors: string[] }> = [];

    // Process results
    if (result.results) {
      result.results.forEach(({ attribute, errors }, index) => {
        const actualUpdate = actualUpdates[index];
        const originalIndex = actualUpdate
          ? updateInputs.findIndex((u) => u.id === actualUpdate.id)
          : -1;
        const originalInput = originalIndex >= 0 ? updates[originalIndex]?.input : undefined;

        if (errors && errors.length > 0) {
          const inputName = originalInput?.name ?? `index-${index}`;
          failed.push({
            input: originalInput ?? ({ name: inputName } as FullAttribute),
            errors: errors.map((e) => `${e.path || ""}: ${e.message}`),
          });
          logger.warn(`Failed to update attribute: ${inputName}`, { errors });
        } else if (attribute) {
          successful.push(attribute);
        }
      });
    }

    // Surface global errors as failures
    if (result.errors && result.errors.length > 0) {
      logger.warn("Global errors during bulk attribute update", { errors: result.errors });
      for (const err of result.errors) {
        failed.push({
          input: updates[0]?.input ?? ({ name: "unknown" } as FullAttribute),
          errors: [`Global error: ${err.path || ""}: ${err.message}`],
        });
      }
    }

    logger.info(`Bulk update complete: ${successful.length} successful, ${failed.length} failed`);

    return { successful, failed };
  }
}

/**
 * Shared cache-first resolution for referenced attribute names.
 * Returns { resolvedIds, unresolvedNames } — callers decide how to handle unresolved.
 */
export async function resolveAttributeNamesWithCache(
  names: string[],
  section: "product" | "content",
  attributeCache: AttributeCache | undefined,
  repository: AttributeOperations
): Promise<{ resolvedIds: string[]; unresolvedNames: string[] }> {
  if (names.length === 0) return { resolvedIds: [], unresolvedNames: [] };

  const resolvedIds: string[] = [];
  const cacheMisses: string[] = [];

  // Step 1: Try cache
  if (attributeCache) {
    for (const name of names) {
      const cached =
        section === "product"
          ? attributeCache.getProductAttribute(name)
          : attributeCache.getContentAttribute(name);
      if (cached) {
        resolvedIds.push(cached.id);
      } else {
        cacheMisses.push(name);
      }
    }
  } else {
    cacheMisses.push(...names);
  }

  // Step 2: API fallback for cache misses
  if (cacheMisses.length > 0) {
    const apiType = section === "product" ? "PRODUCT_TYPE" : "PAGE_TYPE";
    const apiResolved = await repository.getAttributesByNames({
      names: cacheMisses,
      type: apiType,
    });

    const resolvedNameSet = new Set<string>();
    for (const attr of apiResolved) {
      if (attr.name) {
        resolvedIds.push(attr.id);
        resolvedNameSet.add(attr.name);
      }
    }
    const stillUnresolved = cacheMisses.filter((n) => !resolvedNameSet.has(n));
    return { resolvedIds, unresolvedNames: stillUnresolved };
  }

  return { resolvedIds, unresolvedNames: [] };
}

/**
 * Result of attribute reference validation.
 */
export type AttributeValidationResult =
  | { valid: true; attribute: CachedAttribute }
  | { valid: false; error: AttributeNotFoundError | WrongAttributeTypeError };

/**
 * Validates an attribute reference using the AttributeCache.
 *
 * Validation flow:
 * 1. Check if attribute exists in expected section (product/content)
 * 2. If not found, check if it exists in the wrong section
 * 3. If not found anywhere, find similar names for suggestions
 *
 * @param attributeName - The name of the attribute being referenced
 * @param expectedSection - Whether this is a product or content attribute reference
 * @param referencingEntityType - The type of entity making the reference (productTypes/modelTypes)
 * @param referencingEntityName - The name of the entity making the reference
 * @param cache - The AttributeCache to validate against
 * @returns Validation result with attribute if valid, or error if invalid
 */
export function validateAttributeReference(
  attributeName: string,
  expectedSection: "product" | "content",
  referencingEntityType: "productTypes" | "pageTypes" | "modelTypes",
  referencingEntityName: string,
  cache: AttributeCache
): AttributeValidationResult {
  // Step 1: Check if attribute exists in expected section
  const expectedSectionName =
    expectedSection === "product" ? "productAttributes" : "contentAttributes";
  const attr =
    expectedSection === "product"
      ? cache.getProductAttribute(attributeName)
      : cache.getContentAttribute(attributeName);

  if (attr) {
    return { valid: true, attribute: attr };
  }

  // Step 2: Check if attribute exists in wrong section
  const wrongSectionResult = cache.findAttributeInWrongSection(attributeName, expectedSection);
  if (wrongSectionResult.found) {
    const foundInSection =
      wrongSectionResult.actualSection === "product" ? "productAttributes" : "contentAttributes";
    return {
      valid: false,
      error: new WrongAttributeTypeError(
        attributeName,
        foundInSection as "productAttributes" | "contentAttributes",
        expectedSectionName as "productAttributes" | "contentAttributes",
        referencingEntityType,
        referencingEntityName
      ),
    };
  }

  // Step 3: Attribute not found anywhere - find similar names
  const allNames =
    expectedSection === "product"
      ? cache.getAllProductAttributeNames()
      : cache.getAllContentAttributeNames();
  const similarNames = findSimilarNames(attributeName, allNames);

  return {
    valid: false,
    error: new AttributeNotFoundError(
      attributeName,
      expectedSectionName as "productAttributes" | "contentAttributes",
      referencingEntityType,
      referencingEntityName,
      similarNames
    ),
  };
}
