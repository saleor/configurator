import type { AttributeInput, PageTypeInput } from "../configurator";
import type { PageType, SaleorClient } from "../saleor-client";

// Page Types follow a very similar interface to Product Types
export class PageTypeBootstraper {
  constructor(private client: SaleorClient) {}

  private async getOrCreateAttributes(attributeInputs: AttributeInput[]) {
    const names = attributeInputs.map((attribute) => attribute.name);
    const attributes = await this.client.getAttributesByNames({
      names,
      type: "PAGE_TYPE",
    });

    // TODO: refactor to single factory for page types and product types
    if (!attributes || attributes.length === 0) {
      console.log("Attributes not found, creating...");
      return await Promise.all(
        attributeInputs.map((attribute) => {
          const slug = attribute.name.toLowerCase().replace(/ /g, "-");
          const type = "PAGE_TYPE";
          const name = attribute.name;
          const inputType = attribute.inputType;

          if (attribute.inputType === "DROPDOWN") {
            return this.client.createAttribute({
              name,
              type,
              slug,
              inputType,
              values: attribute.values.map((value) => ({
                name: value.name,
              })),
            });
          }

          return this.client.createAttribute({
            name,
            type,
            slug,
            inputType: attribute.inputType,
          });
        })
      );
    }

    console.log("Attributes already exist", attributes);

    return attributes;
  }
  private async getOrCreatePageType(name: string): Promise<PageType> {
    const pageType = await this.client.getPageTypeByName(name);

    const isPageType = pageType?.name === name;

    if (!isPageType) {
      console.log("Page type not found, creating...");
      return this.client.createPageType({ name });
    }

    console.log("Page type already exists", pageType);

    return pageType;
  }

  private async verifyIfAttributesExist(
    pageType: PageType,
    attributeInputs: AttributeInput[]
  ) {
    const names = attributeInputs.map((attribute) => attribute.name);

    const pageTypeAttributesNames = pageType.attributes?.map(
      (attribute) => attribute.name
    );

    // TODO: skip individual attributes that already exist, not the whole array
    return names.every((name) => pageTypeAttributesNames?.includes(name));
  }

  async bootstrapPageType(input: PageTypeInput) {
    const attributes = await this.getOrCreateAttributes(input.attributes);

    const pageType = await this.getOrCreatePageType(input.name);

    const isAttributesAlreadyAssigned = await this.verifyIfAttributesExist(
      pageType,
      input.attributes
    );

    if (isAttributesAlreadyAssigned) {
      console.log("Attributes already assigned to page type");
      return;
    }

    console.log("Attributes", attributes);

    await this.client.assignAttributesToPageType({
      pageTypeId: pageType.id,
      attributeIds: attributes.map((attribute) => attribute.id),
    });

    console.log("Attributes assigned to page type");
  }
}
