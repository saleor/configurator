import type { AttributeInput } from "../../config/schema";
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
    const existingAttributes = await this.repository.getAttributesByNames({
      names: [name],
      type,
    });

    const existingAttribute = existingAttributes?.[0];
    if (existingAttribute) {
      return existingAttribute;
    }

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
    return attributeInputs.filter(
      (attribute) => !existingAttributes?.some((a) => a.name === attribute.name)
    );
  }

  async bootstrapAttributes({
    attributeInputs,
    type,
  }: {
    attributeInputs: AttributeInput[];
    type: "PRODUCT_TYPE" | "PAGE_TYPE";
  }) {
    const names = attributeInputs.map((attribute) => attribute.name);
    const existingAttributes = await this.repository.getAttributesByNames({
      names,
      type,
    });

    const attributesToCreate = this.filterOutExistingAttributes(
      existingAttributes ?? [],
      attributeInputs
    );

    if (!attributesToCreate.length) {
      return existingAttributes ?? [];
    }

    return await Promise.all(
      attributesToCreate.map((attribute) => {
        const attributeInput = createAttributeInput(attribute, type);
        return this.repository.createAttribute(attributeInput);
      })
    );
  }
}
