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

  if ("values" in input && input.values) {
    const existingValues = existingAttribute.choices?.edges?.map((edge) => edge.node.name) || [];
    const newValues = input.values.map((v) => v.name);
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

type BulkResultEntry = {
  attribute: (Attribute & Record<string, unknown>) | null;
  errors: ReadonlyArray<{ path?: string | null; message: string | null }> | null;
};

type BulkResultErrors = readonly { path?: string | null; message: string | null }[];

type BulkFailure = { input: { name: string }; errors: string[] };

function processBulkMutationResults(
  results: readonly BulkResultEntry[] | null | undefined,
  globalErrors: BulkResultErrors | null | undefined,
  resolveInput: (index: number, attribute: Attribute | null) => FullAttribute | undefined,
  operationLabel: string
): { successful: Attribute[]; failed: BulkFailure[] } {
  const successful: Attribute[] = [];
  const failed: BulkFailure[] = [];

  if (results) {
    results.forEach(({ attribute, errors }, index) => {
      if (errors && errors.length > 0) {
        const failedInput = resolveInput(index, attribute);
        if (failedInput) {
          failed.push({
            input: failedInput,
            errors: errors.map((e) => `${e.path || ""}: ${e.message || ""}`),
          });
          logger.warn(`Failed to ${operationLabel} attribute: ${failedInput.name}`, { errors });
        }
      } else if (attribute) {
        successful.push(attribute);
      } else {
        const input = resolveInput(index, null);
        if (input) {
          failed.push({
            input,
            errors: [`Attribute ${operationLabel} returned no result and no error`],
          });
          logger.warn(`Bulk ${operationLabel} returned empty result for attribute: ${input.name}`);
        }
      }
    });
  }

  if (globalErrors && globalErrors.length > 0) {
    logger.warn(`Global errors during bulk attribute ${operationLabel}`, { errors: globalErrors });
    for (const err of globalErrors) {
      failed.push({
        input: { name: "(global bulk error)" },
        errors: [`Global error: ${err.path || ""}: ${err.message || ""}`],
      });
    }
  }

  return { successful, failed };
}

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
    const referencedAttributes = inputAttributes.filter(isReferencedAttribute);

    if (referencedAttributes.length === 0) {
      return [];
    }

    logger.debug("Resolving referenced attributes", {
      count: referencedAttributes.length,
      type: attributeType,
    });

    const referencedAttributeNames = referencedAttributes.map((a) => a.attribute);
    const existingSet = new Set(existingAttributeNames);
    const unassignedAttributeNames = referencedAttributeNames.filter(
      (name) => !existingSet.has(name)
    );

    if (unassignedAttributeNames.length === 0) {
      logger.debug("All referenced attributes are already assigned");
      return [];
    }

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

    const hasChanges = Object.keys(updateInput).length > 1;
    if (hasChanges) {
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
    failed: BulkFailure[];
  }> {
    logger.info(`Creating ${attributes.length} attributes via bulk mutation`);

    const inputs = attributes.map(createAttributeInput);
    const result = await this.repository.bulkCreateAttributes({
      attributes: inputs,
      errorPolicy: "IGNORE_FAILED",
    });

    const { successful, failed } = processBulkMutationResults(
      result.results,
      result.errors,
      (index, attribute) => {
        if (attribute?.name) {
          return attributes.find((a) => a.name === attribute.name) ?? attributes[index];
        }
        return attributes[index];
      },
      "create"
    );

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
    failed: BulkFailure[];
  }> {
    logger.info(`Updating ${updates.length} attributes via bulk mutation`);

    const updateInputs = updates.map(({ input, existing }) => ({
      id: existing.id,
      fields: createAttributeUpdateInput(input, existing),
    }));

    const actualUpdates = updateInputs.filter((update) => Object.keys(update.fields).length > 1);

    if (actualUpdates.length === 0) {
      logger.info("No attributes require updates");
      return { successful: updates.map((u) => u.existing), failed: [] };
    }

    const result = await this.repository.bulkUpdateAttributes({
      attributes: actualUpdates,
      errorPolicy: "IGNORE_FAILED",
    });

    const idToIndex = new Map(updateInputs.map((u, i) => [u.id, i]));
    const { successful, failed } = processBulkMutationResults(
      result.results,
      result.errors,
      (index) => {
        const actualUpdate = actualUpdates[index];
        if (!actualUpdate) return undefined;
        const originalIndex = idToIndex.get(actualUpdate.id);
        if (originalIndex === undefined) return undefined;
        return updates[originalIndex]?.input;
      },
      "update"
    );

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
type AttributeSectionLabel = "productAttributes" | "contentAttributes";

function toSectionLabel(section: "product" | "content"): AttributeSectionLabel {
  return section === "product" ? "productAttributes" : "contentAttributes";
}

export function validateAttributeReference(
  attributeName: string,
  expectedSection: "product" | "content",
  referencingEntityType: "productTypes" | "pageTypes" | "modelTypes",
  referencingEntityName: string,
  cache: AttributeCache
): AttributeValidationResult {
  const expectedSectionLabel = toSectionLabel(expectedSection);
  const attr =
    expectedSection === "product"
      ? cache.getProductAttribute(attributeName)
      : cache.getContentAttribute(attributeName);

  if (attr) {
    return { valid: true, attribute: attr };
  }

  const wrongSectionResult = cache.findAttributeInWrongSection(attributeName, expectedSection);
  if (wrongSectionResult.found) {
    const foundInSectionLabel = toSectionLabel(wrongSectionResult.actualSection);
    return {
      valid: false,
      error: new WrongAttributeTypeError(
        attributeName,
        foundInSectionLabel,
        expectedSectionLabel,
        referencingEntityType,
        referencingEntityName
      ),
    };
  }

  const allNames =
    expectedSection === "product"
      ? cache.getAllProductAttributeNames()
      : cache.getAllContentAttributeNames();
  const similarNames = findSimilarNames(attributeName, allNames);

  return {
    valid: false,
    error: new AttributeNotFoundError(
      attributeName,
      expectedSectionLabel,
      referencingEntityType,
      referencingEntityName,
      similarNames
    ),
  };
}
