import type { PageTypeOperations, PageType } from "./repository";
import type { AttributeService } from "../attribute/service";
import type { PageTypeInput } from "../../config/schema";

export class PageTypeService {
  constructor(
    private repository: PageTypeOperations,
    private attributeService: AttributeService
  ) {}

  private async getOrCreate(name: string) {
    const pageType = await this.repository.getPageTypeByName(name);
    if (pageType?.name === name) {
      return pageType;
    }

    return this.repository.createPageType({ name });
  }

  private async filterOutAssignedAttributes(
    pageTypeId: string,
    attributeIds: string[]
  ) {
    const pageType = await this.repository.getPageType(pageTypeId);
    if (!pageType?.attributes?.length) {
      return attributeIds;
    }

    const assignedAttributeIds = new Set(
      pageType.attributes.map((attr: { id: string }) => attr.id)
    );
    return attributeIds.filter((id) => !assignedAttributeIds.has(id));
  }

  async bootstrapPageType(input: PageTypeInput) {
    const pageType = await this.getOrCreate(input.name);

    const attributes = await this.attributeService.bootstrapAttributes({
      attributeInputs: input.attributes,
      type: "PAGE_TYPE",
    });

    const attributeIds = attributes.map((attr) => attr.id);
    const attributesToAssign = await this.filterOutAssignedAttributes(
      pageType.id,
      attributeIds
    );

    if (attributesToAssign.length > 0) {
      await this.repository.assignAttributes(pageType.id, attributesToAssign);
    }

    return pageType;
  }
}
