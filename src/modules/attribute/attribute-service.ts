import type { AttributeInput } from "../config/schema";
import { logger } from "../../lib/logger";
import type {
  AttributeCreateInput,
  AttributeOperations,
  Attribute,
} from "./repository";

// Internal type that matches what we can actually create
interface InternalAttributeCreateInput {
  name: string;
  type: string;
  slug: string;
  inputType: string;
  entityType?: string;
  values?: Array<{ name: string }>;
}

const createAttributeInput = (input: AttributeInput): InternalAttributeCreateInput => {
  const base: InternalAttributeCreateInput = {
    name: input.name,
    type: input.type,
    slug: input.name.toLowerCase().replace(/ /g, "-"),
    inputType: input.inputType,
  };

  switch (input.inputType) {
    case "REFERENCE":
      return {
        ...base,
        entityType: input.entityType,
      };
    
    case "DROPDOWN":
    case "MULTISELECT":
    case "SWATCH":
      return {
        ...base,
        values: input.values.map((value) => ({
          name: value.name,
        })),
      };
    
    case "PLAIN_TEXT":
    case "NUMERIC":
    case "DATE":
    case "BOOLEAN":
    case "RICH_TEXT":
    case "DATE_TIME":
    case "FILE":
    default:
      return base;
  }
};

export class AttributeService {
  constructor(private repository: AttributeOperations) {}

  async bootstrapAttributes({
    attributeInputs,
  }: {
    attributeInputs: AttributeInput[];
  }): Promise<Attribute[]> {
    logger.debug("Bootstrapping attributes", {
      count: attributeInputs.length,
    });

    const createdAttributes = await Promise.all(
      attributeInputs.map(async (attribute) => {
        const slug = attribute.name.toLowerCase().replace(/ /g, "-");
        
        logger.debug("Looking up existing attribute", { 
          name: attribute.name, 
          slug, 
          type: attribute.type 
        });
        
        const existingAttribute = await this.repository.getAttributeBySlug(
          slug,
          attribute.type
        ) as Attribute | null;

        if (existingAttribute) {
          logger.debug("Found existing attribute", {
            id: existingAttribute.id,
            name: existingAttribute.name,
            slug,
          });
          return existingAttribute;
        }

        logger.debug("Creating new attribute", { name: attribute.name });
        const attributeInput = createAttributeInput(attribute);
        // Cast to the GraphQL type for the repository call
        return this.repository.createAttribute(attributeInput as AttributeCreateInput);
      })
    );

    return createdAttributes;
  }

  async getAttributeByName(name: string): Promise<Attribute | null | undefined> {
    return this.repository.getAttributeByName(name);
  }
}
