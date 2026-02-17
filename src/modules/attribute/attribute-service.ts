import {
  AttributeNotFoundError,
  findSimilarNames,
  WrongAttributeTypeError,
} from "../../lib/errors/validation-errors";
import { logger } from "../../lib/logger";
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
    slug: input.name.toLowerCase().replace(/ /g, "-"),
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

    if (!existingAttributes || existingAttributes.length === 0) {
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

    // Process results
    if (result.results) {
      result.results.forEach(({ attribute, errors }, index) => {
        if (errors && errors.length > 0) {
          failed.push({
            input: attributes[index],
            errors: errors.map((e) => `${e.path || ""}: ${e.message}`),
          });
          logger.warn(`Failed to create attribute: ${attributes[index].name}`, { errors });
        } else if (attribute) {
          successful.push(attribute);
        }
      });
    }

    // Log global errors if any
    if (result.errors && result.errors.length > 0) {
      logger.warn("Global errors during bulk attribute creation", { errors: result.errors });
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
        const originalIndex = updateInputs.findIndex((u) => u.id === actualUpdates[index].id);
        if (errors && errors.length > 0) {
          failed.push({
            input: updates[originalIndex].input,
            errors: errors.map((e) => `${e.path || ""}: ${e.message}`),
          });
          logger.warn(`Failed to update attribute: ${updates[originalIndex].input.name}`, {
            errors,
          });
        } else if (attribute) {
          successful.push(attribute);
        }
      });
    }

    // Log global errors if any
    if (result.errors && result.errors.length > 0) {
      logger.warn("Global errors during bulk attribute update", { errors: result.errors });
    }

    logger.info(`Bulk update complete: ${successful.length} successful, ${failed.length} failed`);

    return { successful, failed };
  }
}

/**
 * Result of attribute reference validation.
 */
export interface AttributeValidationResult {
  valid: boolean;
  attribute?: CachedAttribute;
  error?: AttributeNotFoundError | WrongAttributeTypeError;
}

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
  referencingEntityType: "productTypes" | "modelTypes",
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
