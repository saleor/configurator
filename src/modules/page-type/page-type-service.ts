import {
  AttributeNotFoundError,
  WrongAttributeTypeError,
} from "../../lib/errors/validation-errors";
import { logger } from "../../lib/logger";
import type { AttributeCache } from "../attribute/attribute-cache";
import type { AttributeService } from "../attribute/attribute-service";
import {
  isReferencedAttribute,
  resolveAttributeNamesWithCache,
  validateAttributeReference,
} from "../attribute/attribute-service";
import type { SimpleAttribute } from "../config/schema/attribute.schema";
import type { PageTypeInput, PageTypeUpdateInput } from "../config/schema/schema";
import { PageTypeAttributeError, PageTypeAttributeValidationError } from "./errors";
import type { PageTypeOperations } from "./repository";

/** Options for page type bootstrap operations */
export interface BootstrapPageTypeOptions {
  /** Optional attribute cache for fast reference resolution */
  attributeCache?: AttributeCache;
  /** The entity type label for error messages (e.g., "pageTypes" or "modelTypes") */
  referencingEntityType?: "pageTypes" | "modelTypes";
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

  private filterOutAssignedAttributes(
    pageType: { attributes?: Array<{ id: string }> | null },
    attributeIds: string[]
  ): string[] {
    if (!pageType?.attributes?.length) {
      return attributeIds;
    }

    const assignedIds = new Set(pageType.attributes.map((a) => a.id));
    return attributeIds.filter((id) => !assignedIds.has(id));
  }

  /**
   * Resolves referenced attributes using cache-first strategy with API fallback.
   * Returns attribute IDs for attributes that need to be assigned.
   */
  private async resolveReferencedAttributesWithCache(
    inputAttributes: Array<{ attribute: string } | SimpleAttribute>,
    existingAttributeNames: string[],
    attributeCache?: AttributeCache,
    entityName?: string,
    referencingEntityType: "pageTypes" | "modelTypes" = "pageTypes"
  ): Promise<string[]> {
    const referencedAttributes = inputAttributes.filter(isReferencedAttribute);
    if (referencedAttributes.length === 0) return [];

    const referencedAttrNames = referencedAttributes.map((a) => a.attribute);
    const existingSet = new Set(existingAttributeNames);
    const unassignedNames = referencedAttrNames.filter((name) => !existingSet.has(name));
    if (unassignedNames.length === 0) {
      logger.debug("All referenced content attributes are already assigned");
      return [];
    }

    // Use shared cache-first resolution
    const { resolvedIds, unresolvedNames } = await resolveAttributeNamesWithCache(
      unassignedNames,
      "content",
      attributeCache,
      this.attributeService.repo
    );

    // Handle unresolved names
    if (unresolvedNames.length > 0) {
      if (attributeCache) {
        for (const name of unresolvedNames) {
          const result = validateAttributeReference(
            name,
            "content",
            referencingEntityType,
            entityName ?? "unknown",
            attributeCache
          );
          if (!result.valid) {
            throw result.error;
          }
        }
      } else {
        throw new PageTypeAttributeValidationError(
          `Could not resolve content attributes: ${unresolvedNames.join(", ")}`,
          entityName ?? "unknown",
          unresolvedNames.join(", ")
        );
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

      // Check which inline attributes already exist globally before creating
      const inlineInputs = attributesToCreate.filter((a) => "name" in a);
      let attributes: { id: string }[];

      if (inlineInputs.length > 0) {
        const existingGlobal = await this.attributeService.repo.getAttributesByNames({
          names: inlineInputs.map((a) => a.name),
          type: "PAGE_TYPE",
        });
        const existingMap = new Map(
          existingGlobal
            .filter((a): a is typeof a & { name: string } => typeof a.name === "string")
            .map((a) => [a.name, a] as const)
        );

        const toCreate = inlineInputs.filter((a) => !existingMap.has(a.name));
        const reused = inlineInputs
          .filter((a) => existingMap.has(a.name))
          .map((a) => {
            const existing = existingMap.get(a.name);
            if (!existing) throw new Error(`Expected attribute "${a.name}" in existing map`);
            return existing;
          });

        let created: { id: string }[] = [];
        if (toCreate.length > 0) {
          try {
            created = await this.attributeService.bootstrapAttributes({
              attributeInputs: toCreate.map((a) => ({
                ...a,
                type: "PAGE_TYPE" as const,
              })),
            });
          } catch (error) {
            if (
              error instanceof AttributeNotFoundError ||
              error instanceof WrongAttributeTypeError
            ) {
              throw error;
            }
            throw new PageTypeAttributeError(
              `Failed to create attributes for page type: ${error instanceof Error ? error.message : String(error)}`,
              input.name,
              "attribute_creation"
            );
          }
        }

        if (reused.length > 0) {
          logger.debug("Reusing existing global content attributes", {
            pageType: input.name,
            reusedCount: reused.length,
            reusedNames: inlineInputs.filter((a) => existingMap.has(a.name)).map((a) => a.name),
          });
        }

        attributes = [...reused, ...created];
      } else {
        attributes = [];
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
          options?.attributeCache,
          input.name,
          options?.referencingEntityType ?? "pageTypes"
        );
      } catch (error) {
        if (error instanceof AttributeNotFoundError || error instanceof WrongAttributeTypeError) {
          throw error;
        }
        throw new PageTypeAttributeError(
          `Failed to resolve referenced attributes for page type: ${error instanceof Error ? error.message : String(error)}`,
          input.name,
          "attribute_resolution"
        );
      }

      // Combine new and referenced attribute IDs
      const allAttributeIds = [...attributes.map((attr) => attr.id), ...referencedAttributeIds];

      // Filter out already assigned attributes
      const attributesToAssign = this.filterOutAssignedAttributes(pageType, allAttributeIds);

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
