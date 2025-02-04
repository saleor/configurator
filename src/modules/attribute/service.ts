import type { AttributeInput } from "../config/schema";
import { logger } from "../../lib/logger";
import type {
  AttributeCreateInput,
  AttributeOperations,
  Attribute,
} from "./repository";

const createAttributeInput = (
  input: AttributeInput,
  type: "PRODUCT_TYPE" | "PAGE_TYPE"
): AttributeCreateInput => {
  const base = {
    name: input.name,
    type,
    slug: input.name.toLowerCase().replace(/ /g, "-"),
    inputType: input.inputType,
  };

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

  async getOrCreate(name: string, type: "PRODUCT_TYPE" | "PAGE_TYPE") {
    logger.debug("Looking up attribute", { name, type });
    const existingAttributes = await this.repository.getAttributesByNames({
      names: [name],
      type,
    });

    const existingAttribute = existingAttributes?.[0];
    if (existingAttribute) {
      logger.debug("Found existing attribute", {
        id: existingAttribute.id,
        name: existingAttribute.name,
      });
      return existingAttribute;
    }

    logger.debug("Creating new attribute", { name, type });
    return this.repository.createAttribute({
      name,
      type,
      inputType: "DROPDOWN",
    });
  }

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
    type,
  }: {
    attributeInputs: AttributeInput[];
    type: "PRODUCT_TYPE" | "PAGE_TYPE";
  }) {
    logger.debug("Bootstrapping attributes", {
      count: attributeInputs.length,
      type,
    });

    const names = attributeInputs.map((attribute) => attribute.name);
    logger.debug("Checking existing attributes", { nameCount: names.length });
    const existingAttributes = await this.repository.getAttributesByNames({
      names,
      type,
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
          const attributeInput = createAttributeInput(attribute, type);
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
