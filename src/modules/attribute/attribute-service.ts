import { logger } from "../../lib/logger";
import type { FullAttribute } from "../config/schema";
import type {
  Attribute,
  AttributeCreateInput,
  AttributeOperations,
  AttributeUpdateInput,
} from "./repository";

const createAttributeInput = (input: FullAttribute): AttributeCreateInput => {
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

const createAttributeUpdateInput = (
  input: FullAttribute,
  existingAttribute: Attribute
): AttributeUpdateInput => {
  const base: AttributeUpdateInput = {
    name: input.name,
  };

  // For attributes with values (dropdown, multiselect, swatch), compare and update values
  if ("values" in input && input.values) {
    const existingValues =
      existingAttribute.choices?.edges?.map((edge) => edge.node.name) || [];
    const newValues = input.values.map((v) => v.name);

    // Find values to add
    const valuesToAdd = newValues.filter(
      (value) => !existingValues.includes(value)
    );

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

  async bootstrapAttributes({
    attributeInputs,
  }: {
    attributeInputs: FullAttribute[];
  }) {
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

  async updateAttribute(
    attributeInput: FullAttribute,
    existingAttribute: Attribute
  ) {
    logger.debug("Updating attribute", {
      name: attributeInput.name,
      id: existingAttribute.id,
    });

    const updateInput = createAttributeUpdateInput(
      attributeInput,
      existingAttribute
    );

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
}
