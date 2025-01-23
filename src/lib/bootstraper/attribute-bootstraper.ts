import type { AttributeInput } from "../configurator";
import type {
  Attribute,
  SaleorClient,
} from "../saleor-client/bootstrap-client";

const createAttribute = (
  input: AttributeInput,
  type: "PRODUCT_TYPE" | "PAGE_TYPE"
) => {
  const slug = input.name.toLowerCase().replace(/ /g, "-");
  const name = input.name;
  const inputType = input.inputType;

  if (input.inputType === "DROPDOWN") {
    return {
      name,
      type,
      slug,
      inputType,
      values: input.values.map((value) => ({
        name: value.name,
      })),
    };
  }

  if (input.inputType === "MULTISELECT") {
    return {
      name,
      type,
      slug,
      inputType,
      values: input.values.map((value) => ({
        name: value.name,
      })),
    };
  }

  if (input.inputType === "SWATCH") {
    return {
      name,
      type,
      slug,
      inputType,
      values: input.values.map((value) => ({
        name: value.name,
      })),
    };
  }

  return {
    name,
    type,
    slug,
    inputType,
  };
};

export class AttributeBootstraper {
  constructor(private client: SaleorClient) {}

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
    console.log("Bootstrapping attributes", attributeInputs);
    const names = attributeInputs.map((attribute) => attribute.name);
    const existingAttributes = await this.client.getAttributesByNames({
      names,
      type,
    });

    // filter out attributes that already exist
    const attributesToCreate = this.filterOutExistingAttributes(
      existingAttributes ?? [],
      attributeInputs
    );

    if (!attributesToCreate.length) {
      return existingAttributes ?? [];
    }

    return await Promise.all(
      attributesToCreate.map((attribute) => {
        const attributeInput = createAttribute(attribute, type);

        return this.client.createAttribute(attributeInput);
      })
    );
  }
}
