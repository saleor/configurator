import { logger } from "../../lib/logger";
import type { PageRepository } from "./repository";
import type { PageTypeService } from "../page-type/page-type-service";
import type { AttributeService } from "../attribute/attribute-service";

export interface PageInput {
  title: string;
  slug: string;
  content?: string;
  isPublished?: boolean;
  publishedAt?: string;
  pageTypeName: string;
  attributes?: Array<{
    name: string;
    value: any;
  }>;
}

export class PageService {
  constructor(
    private readonly repository: PageRepository,
    private readonly pageTypeService: PageTypeService,
    private readonly attributeService: AttributeService
  ) {}

  async upsertPages(pages: PageInput[]) {
    logger.info(`Upserting ${pages.length} pages`);
    
    const existingPages = await this.repository.getPages();
    const existingPageMap = new Map(
      existingPages.map((page) => [page.slug, page])
    );
    
    const results = [];
    
    for (const pageInput of pages) {
      try {
        const existingPage = existingPageMap.get(pageInput.slug);
        let page;
        
        if (existingPage) {
          logger.debug(`Updating existing page: ${pageInput.slug}`);
          page = await this.updatePage(existingPage.id, pageInput);
        } else {
          logger.debug(`Creating new page: ${pageInput.slug}`);
          page = await this.createPage(pageInput);
        }
        
        results.push(page);
      } catch (error) {
        logger.error(`Failed to upsert page ${pageInput.slug}`, { error });
        throw error;
      }
    }
    
    return results;
  }

  private async createPage(input: PageInput) {
    // Get page type
    const pageType = await this.pageTypeService.getPageTypeByName(input.pageTypeName);
    if (!pageType) {
      throw new Error(`Page type not found: ${input.pageTypeName}`);
    }
    
    const createInput = {
      title: input.title,
      slug: input.slug,
      content: input.content,
      isPublished: input.isPublished ?? false,
      publishedAt: input.publishedAt,
      pageType: pageType.id,
    };
    
    const page = await this.repository.createPage(createInput);
    
    // Handle attributes
    if (input.attributes?.length) {
      const attributeValues = await this.prepareAttributeValues(input.attributes);
      await this.repository.updatePageAttributes(page.id, attributeValues);
    }
    
    return page;
  }

  private async updatePage(id: string, input: PageInput) {
    // Get page type
    const pageType = await this.pageTypeService.getPageTypeByName(input.pageTypeName);
    if (!pageType) {
      throw new Error(`Page type not found: ${input.pageTypeName}`);
    }
    
    const updateInput = {
      title: input.title,
      slug: input.slug,
      content: input.content,
      isPublished: input.isPublished,
      publishedAt: input.publishedAt,
    };
    
    const page = await this.repository.updatePage(id, updateInput);
    
    // Handle attributes
    if (input.attributes) {
      const attributeValues = await this.prepareAttributeValues(input.attributes);
      await this.repository.updatePageAttributes(id, attributeValues);
    }
    
    return page;
  }

  private async prepareAttributeValues(
    attributes: NonNullable<PageInput["attributes"]>
  ) {
    return Promise.all(
      attributes.map(async (attr) => {
        const attribute = await this.attributeService.getAttributeByName(attr.name);
        if (!attribute) {
          throw new Error(`Attribute not found: ${attr.name}`);
        }

        // Handle different input types
        if (attribute.inputType === "DROPDOWN" || attribute.inputType === "SWATCH") {
          return {
            id: attribute.id,
            dropdown: { value: attr.value },
          };
        } else if (attribute.inputType === "MULTISELECT") {
          return {
            id: attribute.id,
            multiselect: Array.isArray(attr.value)
              ? attr.value.map(v => ({ value: v }))
              : [{ value: attr.value }],
          };
        } else if (attribute.inputType === "NUMERIC") {
          return {
            id: attribute.id,
            numeric: String(attr.value),
          };
        } else if (attribute.inputType === "BOOLEAN") {
          return {
            id: attribute.id,
            boolean: attr.value === "true" || attr.value === true,
          };
        } else if (attribute.inputType === "DATE") {
          return {
            id: attribute.id,
            date: attr.value,
          };
        } else if (attribute.inputType === "DATE_TIME") {
          return {
            id: attribute.id,
            dateTime: attr.value,
          };
        } else if (attribute.inputType === "RICH_TEXT") {
          return {
            id: attribute.id,
            richText: attr.value,
          };
        } else if (attribute.inputType === "FILE") {
          return {
            id: attribute.id,
            file: attr.value, // This should be a URL or file upload
          };
        } else if (attribute.inputType === "REFERENCE") {
          return {
            id: attribute.id,
            reference: attr.value, // This should be an ID
          };
        } else {
          // PLAIN_TEXT and others
          return {
            id: attribute.id,
            plainText: String(attr.value),
          };
        }
      })
    );
  }

  async getPages() {
    logger.debug("Fetching all pages");
    return this.repository.getPages();
  }

  async getPageBySlug(slug: string) {
    logger.debug(`Fetching page by slug: ${slug}`);
    return this.repository.getPage({ slug });
  }

  async getPagesByType(pageTypeName: string) {
    const pages = await this.getPages();
    return pages.filter(page => page.pageType?.name === pageTypeName);
  }
} 