import { logger } from "../../lib/logger";
import type { AttributeService } from "../attribute/attribute-service";
import { isReferencedAttribute } from "../attribute/attribute-service";
import type { SimpleAttribute } from "../config/schema/attribute.schema";
import type { PageTypeInput, PageTypeUpdateInput } from "../config/schema/schema";
import { PageTypeAttributeError } from "./errors";
import type { PageTypeOperations } from "./repository";

export class PageTypeService {
  constructor(
    private repository: PageTypeOperations,
    private attributeService: AttributeService
  ) {}

  async getPageTypeByName(name: string) {
    return this.repository.getPageTypeByName(name);
  }

  async getPageType(id: string) {
    return this.repository.getPageType(id);
  }

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

  private async filterOutAssignedAttributes(pageTypeId: string, attributeIds: string[]) {
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
    const filteredIds = attributeIds.filter((id) => !assignedAttributeIds.has(id));

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
        if (isReferencedAttribute(a)) {
          return false;
        }

        return !pageType.attributes?.some((attr) => attr.name === a.name);
      }) as SimpleAttribute[];

      logger.debug("Attributes to create", {
        attributesToCreate,
      });

      // Create new attributes
      let attributes: { id: string }[];
      try {
        attributes = await this.attributeService.bootstrapAttributes({
          attributeInputs: attributesToCreate
            .filter((a) => "name" in a) // Only create new attributes, not referenced ones
            .map((a) => ({
              ...a,
              type: "PAGE_TYPE" as const,
            })),
        });
      } catch (error) {
        throw new PageTypeAttributeError(
          `Failed to create attributes for page type: ${error instanceof Error ? error.message : String(error)}`,
          input.name,
          "attribute_creation"
        );
      }

      // Resolve referenced attributes
      const existingAttributeNames =
        pageType.attributes
          ?.map((attr) => attr.name)
          .filter((name): name is string => name !== null) ?? [];
      let referencedAttributeIds: string[];
      try {
        referencedAttributeIds = await this.attributeService.resolveReferencedAttributes(
          updateInput.attributes,
          "PAGE_TYPE",
          existingAttributeNames
        );
      } catch (error) {
        throw new PageTypeAttributeError(
          `Failed to resolve referenced attributes for page type: ${error instanceof Error ? error.message : String(error)}`,
          input.name,
          "attribute_resolution"
        );
      }

      // Combine new and referenced attribute IDs
      const allAttributeIds = [...attributes.map((attr) => attr.id), ...referencedAttributeIds];

      // Filter out already assigned attributes
      const attributesToAssign = await this.filterOutAssignedAttributes(
        pageType.id,
        allAttributeIds
      );

      if (attributesToAssign.length > 0) {
        logger.debug("Assigning attributes to page type", {
          pageType: input.name,
          attributeCount: attributesToAssign.length,
          newAttributes: attributes.length,
          referencedAttributes: referencedAttributeIds.length,
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
          throw new PageTypeAttributeError(
            `Failed to assign attributes to page type: ${error instanceof Error ? error.message : String(error)}`,
            input.name,
            "attribute_assignment"
          );
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
