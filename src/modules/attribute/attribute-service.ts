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

export type AttributeValidationResult =
  | { valid: true; attribute: CachedAttribute }
  | { valid: false; error: AttributeNotFoundError | WrongAttributeTypeError };

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
