import { logger } from "../../lib/logger";
import type { AttributeService } from "../attribute/attribute-service";
import type { PageTypeInput } from "../config/schema";
import type { PageTypeOperations } from "./repository";

export class PageTypeService {
  constructor(
    private repository: PageTypeOperations,
    private attributeService: AttributeService
  ) {}

  private async getOrCreate(name: string) {
    logger.debug("Looking up page type", { name });
    const pageType = await this.repository.getPageTypeByName(name);
    if (pageType?.name === name) {
      logger.debug("Found existing page type", { pageType });
      return pageType;
    }

    logger.debug("Creating new page type", { name });
    return this.repository.createPageType({ name });
  }

  private async filterOutAssignedAttributes(
    pageTypeId: string,
    attributeIds: string[]
  ) {
    logger.debug("Checking for assigned attributes", {
      pageTypeId,
      attributeIds,
    });
    const pageType = await this.repository.getPageType(pageTypeId);
    if (!pageType?.attributes?.length) {
      logger.debug("No existing attributes found for page type", {
        pageTypeId,
      });
      return attributeIds;
    }

    const assignedAttributeIds = new Set(
      pageType.attributes.map((attr: { id: string }) => attr.id)
    );
    const filteredIds = attributeIds.filter(
      (id) => !assignedAttributeIds.has(id)
    );

    return filteredIds;
  }

  async bootstrapPageType(input: PageTypeInput) {
    logger.debug("Bootstrapping page type", {
      name: input.name,
      attributesCount: input.attributes.length,
    });

    const pageType = await this.getOrCreate(input.name);

    logger.debug("Creating attributes for page type", {
      pageType: input.name,
      attributes: input.attributes.map((a) => a.name),
    });

    const attributes = await this.attributeService.bootstrapAttributes({
      attributeInputs: input.attributes.map((a) => ({
        ...a,
        type: "PAGE_TYPE",
      })),
    });

    const attributeIds = attributes.map((attr) => attr.id);
    const attributesToAssign = await this.filterOutAssignedAttributes(
      pageType.id,
      attributeIds
    );

    if (attributesToAssign.length > 0) {
      logger.debug("Assigning attributes to page type", {
        pageType: input.name,
        attributeCount: attributesToAssign.length,
      });

      try {
        await this.repository.assignAttributes(pageType.id, attributesToAssign);
        logger.debug("Successfully assigned attributes to page type", {
          name: input.name,
        });
      } catch (error) {
        logger.error("Failed to assign attributes to page type", {
          error,
          pageType: input.name,
          attributeIds: attributesToAssign,
        });
        throw error;
      }
    } else {
      logger.debug("No new attributes to assign to page type", {
        name: input.name,
      });
    }

    return pageType;
  }
}
