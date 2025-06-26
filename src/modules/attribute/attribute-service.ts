import type { AttributeInput } from "../config/schema";
import { logger } from "../../lib/logger";
import type {
  AttributeCreateInput,
  AttributeUpdateInput,
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
    // Try both 'values' and 'choices' field names for compatibility
    const choiceValues = input.values.map((value) => ({
      name: value.name,
    }));
    
    return {
      ...base,
      values: choiceValues,
      // Also try the choices field in case that's what Saleor expects
      choices: choiceValues,
    };
  }

  return base;
};

const createAttributeUpdateInput = (input: AttributeInput, existingAttribute: Attribute): AttributeUpdateInput => {
  const base: AttributeUpdateInput = {
    name: input.name,
  };

  // For attributes with values (dropdown, multiselect, swatch), compare and update values
  if ("values" in input && input.values) {
    const existingValues = existingAttribute.choices?.edges?.map(edge => edge.node.name) || [];
    const newValues = input.values.map(v => v.name);
    
    // Find values to add
    const valuesToAdd = newValues.filter(value => !existingValues.includes(value));
    
    if (valuesToAdd.length > 0) {
      return {
        ...base,
        addValues: valuesToAdd.map(name => ({ name })),
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
    attributeInputs: AttributeInput[];
  }) {
    logger.debug("Bootstrapping attributes", {
      count: attributeInputs.length,
    });

    const createdAttributes = [];
    
    for (const attribute of attributeInputs) {
      const attributeInput = createAttributeInput(attribute);
      logger.debug("Creating attribute", { name: attributeInput.name });
      
      let createdAttribute = await this.repository.createAttribute(attributeInput);
      
      // Check if this is a dropdown attribute and if choices were created
      if (attribute.inputType === 'DROPDOWN' && attribute.values && attribute.values.length > 0) {
        const choicesCount = createdAttribute.choices?.edges?.length || 0;
        logger.debug(`Dropdown attribute created with ${choicesCount} choices`, {
          name: attribute.name,
          expectedChoices: attribute.values.length,
          actualChoices: choicesCount
        });
        
        // If no choices were created, try to add them via update
        if (choicesCount === 0) {
          logger.warn(`No choices created for dropdown attribute "${attribute.name}", attempting to add via update`);
          try {
            createdAttribute = await this.updateAttribute(attribute, createdAttribute);
          } catch (error) {
            logger.error(`Failed to add choices via update for attribute "${attribute.name}"`, { error });
          }
        }
      }
      
      createdAttributes.push(createdAttribute);
    }

    return createdAttributes;
  }

  async updateAttribute(attributeInput: AttributeInput, existingAttribute: Attribute) {
    logger.debug("Updating attribute", { 
      name: attributeInput.name,
      id: existingAttribute.id 
    });

    const updateInput = createAttributeUpdateInput(attributeInput, existingAttribute);
    
    // Only update if there are actual changes
    if (Object.keys(updateInput).length > 1) { // More than just the name
      return this.repository.updateAttribute(existingAttribute.id, updateInput);
    }

    logger.debug("No changes detected for attribute", { name: attributeInput.name });
    return existingAttribute;
  }
}
