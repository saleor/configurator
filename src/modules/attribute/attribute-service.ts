import type { AttributeInput } from "../config/schema";
import { logger } from "../../lib/logger";
import type {
  AttributeCreateInput,
  AttributeOperations,
  Attribute,
} from "./repository";

const createAttributeInput = (input: AttributeInput): AttributeCreateInput => {
  const base = {
    name: input.name,
    type: input.type,
    slug: input.name.toLowerCase().replace(/ /g, "-"),
    inputType: input.inputType,
  };

  if (input.inputType === "REFERENCE") {
    if (!input.entityType) {
      throw new Error(
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

export class AttributeService {
  constructor(private repository: AttributeOperations) {}

  private filterOutExistingAttributes(
    existingAttributes: Attribute[],
    attributeInputs: AttributeInput[]
  ) {
    const filtered = attributeInputs.filter(
      (attribute) => !existingAttributes?.some((a) => a.name === attribute.name)
    );

    return filtered;
  }

  async bootstrapAttributes({
    attributeInputs,
  }: {
    attributeInputs: AttributeInput[];
  }) {
    logger.debug("Bootstrapping attributes", {
      count: attributeInputs.length,
    });

    const names = attributeInputs.map((attribute) => attribute.name);
    logger.debug("Checking existing attributes", { nameCount: names.length });
    const existingAttributes = await this.repository.getAttributesByNames({
      names,
    });

    const attributesToCreate = this.filterOutExistingAttributes(
      existingAttributes ?? [],
      attributeInputs
    );

    if (!attributesToCreate.length) {
      logger.debug("No new attributes to create");
      return existingAttributes ?? [];
    }

    logger.debug(`Creating ${attributesToCreate.length} new attributes`);
    try {
      const createdAttributes = await Promise.all(
        attributesToCreate.map((attribute) => {
          const attributeInput = createAttributeInput(attribute);
          logger.debug("Creating attribute", { name: attributeInput.name });
          return this.repository.createAttribute(attributeInput);
        })
      );
      logger.debug("Successfully created all attributes", {
        count: createdAttributes.length,
      });
      return createdAttributes;
    } catch (error) {
      logger.error("Failed to create attributes", {
        error: error instanceof Error ? error.message : "Unknown error",
        count: attributesToCreate.length,
      });
      throw error;
    }
  }
}
