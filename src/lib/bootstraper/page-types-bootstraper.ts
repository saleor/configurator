import type { PageTypeInput } from "../configurator";
import type { Attribute, PageType, BootstrapClient } from "./bootstrap-client";
import { AttributeBootstraper } from "./attribute-bootstraper";

// Page Types follow a very similar interface to Product Types
export class PageTypeBootstraper {
  constructor(private client: BootstrapClient) {}

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

  private filterOutAssignedAttributes(
    pageType: PageType,
    attributes: Attribute[]
  ) {
    return attributes.filter(
      (attribute) =>
        !pageType.attributes?.some((a) => a.name === attribute.name)
    );
  }

  async bootstrapPageType(input: PageTypeInput) {
    console.log("Bootstrapping page type", input);
    const attributeBootstraper = new AttributeBootstraper(this.client);
    const attributes = await attributeBootstraper.bootstrapAttributes({
      attributeInputs: input.attributes,
      type: "PAGE_TYPE",
    });

    const pageType = await this.getOrCreatePageType(input.name);

    // filter out attributes that already exist on the page type
    const attributesToAssign = this.filterOutAssignedAttributes(
      pageType,
      attributes
    );

    if (!attributesToAssign.length) {
      console.log("No attributes to assign");
      return;
    }

    await this.client.assignAttributesToPageType({
      pageTypeId: pageType.id,
      attributeIds: attributesToAssign.map((attribute) => attribute.id),
    });

    console.log("Attributes assigned to page type");
  }
}
