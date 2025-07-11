import { logger } from "../../lib/logger";
import type { AttributeService } from "../attribute/attribute-service";
import type { SimpleAttribute } from "../config/schema/attribute.schema";
import type {
  PageTypeInput,
  PageTypeUpdateInput,
} from "../config/schema/schema";
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
    });

    const pageType = await this.getOrCreate(input.name);

    // Check if this is an update input (has attributes)
    if ("attributes" in input) {
      const updateInput = input as PageTypeUpdateInput;
      logger.debug("Processing page type attributes", {
        attributesCount: updateInput.attributes.length,
      });

      // check if the page type has the attributes already
      const attributesToCreate = updateInput.attributes.filter((a) => {
        if ("attribute" in a) {
          return false;
        }

        return !pageType.attributes?.some((attr) => attr.name === a.name);
      }) as SimpleAttribute[];

      logger.debug("Attributes to create", {
        attributesToCreate,
      });

      // ? attribute service only creates attributes. we have loads of attribute methods here, maybe we should move them to the attribute service
      const attributes = await this.attributeService.bootstrapAttributes({
        attributeInputs: attributesToCreate.map((a) => ({
          ...a,
          type: "PAGE_TYPE" as const,
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
          await this.repository.assignAttributes(
            pageType.id,
            attributesToAssign
          );
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
    }

    return pageType;
  }
}
