import type { AttributeValueInput } from "../../lib/graphql/graphql-types";
import { logger } from "../../lib/logger";
import { ServiceErrorWrapper } from "../../lib/utils/error-wrapper";
import { object } from "../../lib/utils/object";
import type { AttributeService } from "../attribute/attribute-service";
import type { PageTypeService } from "../page-type/page-type-service";
import { ModelOperationError, ModelTypeError, ModelValidationError } from "./errors";
import type { ModelOperations, Page, PageCreateInput, PageInput } from "./repository";

export interface ModelInputConfig {
  title: string;
  slug: string;
  modelType: string; // Reference to page type name (model type)
  content?: string;
  isPublished?: boolean;
  publishedAt?: string;
  attributes?: Record<string, string | number | boolean | string[]>;
}

export class ModelService {
  constructor(
    private repository: ModelOperations,
    private pageTypeService: PageTypeService,
    private attributeService: AttributeService
  ) {}

  private async getExistingModel(slug: string): Promise<Page | null> {
    return ServiceErrorWrapper.wrapServiceCall(
      "fetch model",
      "model",
      slug,
      async () => {
        logger.debug("Looking up existing model/page", { slug });
        const page = await this.repository.getPageBySlug(slug);

        if (page) {
          logger.debug("Found existing model/page", {
            id: page.id,
            title: page.title,
            slug: page.slug,
          });
        } else {
          logger.debug("Model/page not found", { slug });
        }

        return page;
      }
    );
  }

  private validateModelInput(input: ModelInputConfig): void {
    if (!input.slug?.trim()) {
      throw new ModelValidationError("Model slug is required", "slug");
    }
    if (!input.title?.trim()) {
      throw new ModelValidationError("Model title is required", "title");
    }
    if (!input.modelType?.trim()) {
      throw new ModelValidationError("Model type is required", "modelType");
    }
  }

  private async resolvePageTypeId(typeName: string): Promise<string> {
    try {
      const pageType = await this.pageTypeService.getPageTypeByName(typeName);
      if (!pageType) {
        throw new ModelTypeError(
          `Model type "${typeName}" not found. Please ensure it exists before creating models.`,
          "new",
          typeName
        );
      }
      return pageType.id;
    } catch (error) {
      if (error instanceof ModelTypeError) {
        throw error;
      }
      throw new ModelTypeError(
        `Failed to resolve model type: ${error instanceof Error ? error.message : String(error)}`,
        "new",
        typeName
      );
    }
  }

  private mapInputToCreateInput(input: ModelInputConfig, pageTypeId: string): PageCreateInput {
    const result = object.filterUndefinedValues({
      title: input.title,
      slug: input.slug,
      pageType: pageTypeId,
      content: input.content,
      isPublished: input.isPublished,
      publishedAt: input.publishedAt,
      attributes: [], // Attributes will be set after creation
    });
    // Ensure required fields are always present
    return { ...result, pageType: pageTypeId } as PageCreateInput;
  }

  private mapInputToUpdateInput(input: ModelInputConfig): PageInput {
    return object.filterUndefinedValues({
      title: input.title,
      slug: input.slug,
      content: input.content,
      isPublished: input.isPublished,
      publishedAt: input.publishedAt,
    });
  }

  async createModel(input: ModelInputConfig): Promise<Page> {
    logger.debug("Creating new model/page", { title: input.title, slug: input.slug });

    this.validateModelInput(input);

    return ServiceErrorWrapper.wrapServiceCall(
      "create model",
      "model",
      input.slug,
      async () => {
        const pageTypeId = await this.resolvePageTypeId(input.modelType);
        const createInput = this.mapInputToCreateInput(input, pageTypeId);
        const page = await this.repository.createPage(createInput);

        // Set attributes if provided
        if (input.attributes && Object.keys(input.attributes).length > 0) {
          await this.updateModelAttributes(page.id, input.attributes, pageTypeId);
        }

        logger.debug("Successfully created model/page", {
          id: page.id,
          title: page.title,
          slug: page.slug,
        });
        return page;
      }
    );
  }

  async updateModel(id: string, input: ModelInputConfig): Promise<Page> {
    return ServiceErrorWrapper.wrapServiceCall(
      "update model",
      "model",
      input.slug,
      async () => {
        logger.debug("Updating model/page", { id, title: input.title, slug: input.slug });

        const updateInput = this.mapInputToUpdateInput(input);
        const page = await this.repository.updatePage(id, updateInput);

        // Update attributes if provided
        if (input.attributes !== undefined) {
          const pageTypeId = await this.resolvePageTypeId(input.modelType);
          await this.updateModelAttributes(id, input.attributes, pageTypeId);
        }

        logger.debug("Successfully updated model/page", {
          id: page.id,
          title: page.title,
          slug: page.slug,
        });
        return page;
      }
    );
  }

  async getOrCreateModel(input: ModelInputConfig): Promise<Page> {
    logger.debug("Getting or creating model/page", { title: input.title, slug: input.slug });
    this.validateModelInput(input);

    const existingModel = await this.getExistingModel(input.slug);

    if (existingModel) {
      logger.debug("Updating existing model/page", {
        id: existingModel.id,
        title: input.title,
        slug: input.slug,
      });
      return this.updateModel(existingModel.id, input);
    }

    return this.createModel(input);
  }

  async bootstrapModels(inputs: ModelInputConfig[]): Promise<Page[]> {
    logger.debug("Bootstrapping models/pages", { count: inputs.length });

    // Validate unique slugs
    const slugs = new Set<string>();
    const duplicateSlugs = new Set<string>();

    for (const input of inputs) {
      if (slugs.has(input.slug)) {
        duplicateSlugs.add(input.slug);
      }
      slugs.add(input.slug);
    }

    if (duplicateSlugs.size > 0) {
      throw new ModelValidationError(
        `Duplicate model slugs found: ${Array.from(duplicateSlugs).join(", ")}`
      );
    }

    const results = await ServiceErrorWrapper.wrapBatch(
      inputs,
      "Bootstrap models",
      (model) => model.slug,
      (input) => this.getOrCreateModel(input)
    );

    if (results.failures.length > 0) {
      const errorMessage = `Failed to bootstrap ${results.failures.length} of ${inputs.length} models`;
      logger.error(errorMessage, {
        failures: results.failures.map((f) => ({
          model: f.item.slug,
          error: f.error.message,
        })),
      });
      throw new ModelOperationError(
        "bootstrap",
        "models",
        results.failures.map((f) => `${f.item.slug}: ${f.error.message}`).join("; ")
      );
    }

    logger.debug("Successfully bootstrapped all models", {
      count: results.successes.length,
    });
    return results.successes.map((s) => s.result);
  }

  private async updateModelAttributes(
    pageId: string,
    attributes: Record<string, string | number | boolean | string[]>,
    pageTypeId: string
  ): Promise<void> {
    logger.debug("Updating model attributes", {
      pageId,
      attributeCount: Object.keys(attributes).length,
    });

    // Get page type to understand available attributes
    const pageType = await this.pageTypeService.getPageType(pageTypeId);
    if (!pageType || !pageType.attributes) {
      logger.warn("Page type has no attributes defined", { pageTypeId });
      return;
    }

    const attributeValues: AttributeValueInput[] = [];

    for (const [slug, value] of Object.entries(attributes)) {
      const attribute = pageType.attributes.find((attr: any) => attr.slug === slug);

      if (!attribute) {
        logger.warn(`Attribute "${slug}" not found in page type, skipping`, {
          pageTypeId,
          availableAttributes: pageType.attributes.map((a: any) => a.slug),
        });
        continue;
      }

      // Build attribute value input based on type
      const attributeValue: AttributeValueInput = {
        id: attribute.id,
        values: [],
      };

      // Convert value to appropriate format
      if (Array.isArray(value)) {
        attributeValue.values = value.map((v) => String(v));
      } else if (typeof value === "boolean") {
        attributeValue.boolean = value;
      } else if (value && typeof value === "object" && "toISOString" in value) {
        const dateValue = value as Date;
        attributeValue.date = dateValue.toISOString().split("T")[0];
      } else if (value !== null && value !== undefined) {
        attributeValue.values = [String(value)];
      }

      if (
        (attributeValue.values && attributeValue.values.length > 0) ||
        attributeValue.boolean !== undefined ||
        attributeValue.date
      ) {
        attributeValues.push(attributeValue);
      }
    }

    if (attributeValues.length > 0) {
      await this.repository.updatePageAttributes(pageId, attributeValues);
      logger.debug("Successfully updated model attributes", {
        pageId,
        updatedCount: attributeValues.length,
      });
    }
  }

  async getAllModels(): Promise<Page[]> {
    return ServiceErrorWrapper.wrapServiceCall(
      "fetch all models",
      "models",
      "all",
      async () => {
        logger.debug("Fetching all models/pages");
        const pages = await this.repository.getPages();
        logger.debug(`Fetched ${pages.length} models/pages`);
        return pages;
      }
    );
  }

  async getModelBySlug(slug: string): Promise<Page | null> {
    return this.getExistingModel(slug);
  }
}
