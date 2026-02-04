import { logger } from "../../lib/logger";
import type { AttributeCache } from "../attribute/attribute-cache";
import type { AttributeService } from "../attribute/attribute-service";
import { isReferencedAttribute, validateAttributeReference } from "../attribute/attribute-service";
import type { SimpleAttribute } from "../config/schema/attribute.schema";
import type { PageTypeInput, PageTypeUpdateInput } from "../config/schema/schema";
import { PageTypeAttributeError, PageTypeAttributeValidationError } from "./errors";
import type { PageTypeOperations } from "./repository";

/** Options for page type bootstrap operations */
export interface BootstrapPageTypeOptions {
  /** Optional attribute cache for fast reference resolution */
  attributeCache?: AttributeCache;
}

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

  /**
   * Resolves referenced attributes using cache-first strategy with API fallback.
   * Returns attribute IDs for attributes that need to be assigned.
   */
  private async resolveReferencedAttributesWithCache(
    inputAttributes: Array<{ attribute: string } | SimpleAttribute>,
    existingAttributeNames: string[],
    attributeCache?: AttributeCache
  ): Promise<string[]> {
    // Filter out attributes that are referenced by name
    const referencedAttributes = inputAttributes.filter(isReferencedAttribute);

    if (referencedAttributes.length === 0) {
      return [];
    }

    const referencedAttrNames = referencedAttributes.map((a) => a.attribute);

    // Filter out attributes that are already assigned
    const unassignedNames = referencedAttrNames.filter(
      (name) => !existingAttributeNames.includes(name)
    );

    if (unassignedNames.length === 0) {
      logger.debug("All referenced content attributes are already assigned");
      return [];
    }

    const resolvedIds: string[] = [];
    const cacheHits: string[] = [];
    const cacheMisses: string[] = [];

    // Step 1: Try to resolve from cache if available
    if (attributeCache) {
      for (const name of unassignedNames) {
        const cached = attributeCache.getContentAttribute(name);
        if (cached) {
          resolvedIds.push(cached.id);
          cacheHits.push(name);
        } else {
          cacheMisses.push(name);
        }
      }

      if (cacheHits.length > 0) {
        logger.debug("Resolved content attributes from cache", {
          cacheHits: cacheHits.length,
          cacheMisses: cacheMisses.length,
        });
      }
    } else {
      // No cache provided, all names are cache misses
      cacheMisses.push(...unassignedNames);
    }

    // Step 2: Fallback to API for cache misses
    if (cacheMisses.length > 0) {
      logger.debug("Resolving content attributes via API (cache miss)", {
        attributeNames: cacheMisses,
      });

      const apiResolved = await this.attributeService.repo.getAttributesByNames({
        names: cacheMisses,
        type: "PAGE_TYPE",
      });

      if (apiResolved) {
        const resolvedNames = new Set(apiResolved.map((attr) => attr.name).filter(Boolean));
        resolvedIds.push(...apiResolved.map((attr) => attr.id));

        // Check for any unresolved cache misses and validate with detailed errors
        const unresolvedNames = cacheMisses.filter((name) => !resolvedNames.has(name));
        if (unresolvedNames.length > 0 && attributeCache) {
          for (const name of unresolvedNames) {
            const result = validateAttributeReference(
              name,
              "content",
              "modelTypes",
              inputAttributes.length > 0 ? "current model type" : "unknown",
              attributeCache
            );
            if (!result.valid && result.error) {
              throw result.error;
            }
          }
        }
      }
    }

    return resolvedIds;
  }

  async bootstrapPageType(input: PageTypeInput, options?: BootstrapPageTypeOptions) {
    logger.debug("Bootstrapping page type", {
      name: input.name,
      hasCacheProvided: Boolean(options?.attributeCache),
    });

    const pageType = await this.getOrCreate(input.name);

    // Check if this is an update input (has attributes)
    if ("attributes" in input) {
      const updateInput = input as PageTypeUpdateInput;
      logger.debug("Processing page type attributes", {
        attributesCount: updateInput.attributes.length,
      });

      // Validate REFERENCE attributes have entityType
      for (const attr of updateInput.attributes) {
        if (!isReferencedAttribute(attr) && "inputType" in attr && attr.inputType === "REFERENCE") {
          if (!("entityType" in attr) || !attr.entityType) {
            throw new PageTypeAttributeValidationError(
              `Attribute "${attr.name}" is a REFERENCE type but missing required 'entityType'. ` +
                `Please specify entityType as "PAGE", "PRODUCT", or "PRODUCT_VARIANT" in your config.`,
              input.name,
              attr.name
            );
          }
        }
      }

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

      // Resolve referenced attributes (cache-first with API fallback)
      const existingAttributeNames =
        pageType.attributes
          ?.map((attr) => attr.name)
          .filter((name): name is string => name !== null) ?? [];
      let referencedAttributeIds: string[];
      try {
        referencedAttributeIds = await this.resolveReferencedAttributesWithCache(
          updateInput.attributes,
          existingAttributeNames,
          options?.attributeCache
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
