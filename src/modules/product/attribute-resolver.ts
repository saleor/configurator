import { logger } from "../../lib/logger";
import type { Attribute, ProductOperations } from "./repository";

type ReferenceResolvers = {
  getPageBySlug?: (slug: string) => Promise<{ id: string } | null>;
  // Optional attribute cache accessor (shared attribute shape across repos)
  getAttributeByNameFromCache?: (name: string) => Attribute | null;
};

// Constants
const ATTRIBUTE_INPUT_TYPES = {
  PLAIN_TEXT: "PLAIN_TEXT",
  DROPDOWN: "DROPDOWN",
  MULTISELECT: "MULTISELECT",
  SWATCH: "SWATCH",
  REFERENCE: "REFERENCE",
  NUMERIC: "NUMERIC",
  DATE: "DATE",
  DATE_TIME: "DATE_TIME",
  BOOLEAN: "BOOLEAN",
  RICH_TEXT: "RICH_TEXT",
  FILE: "FILE",
} as const;

// Types
// GraphQL AttributeValueInput payload union (subset we use)
type AttributeValueInputPayload =
  | { id: string; plainText: string }
  | { id: string; dropdown: { id?: string; externalReference?: string; value?: string } }
  | { id: string; swatch: { id?: string; externalReference?: string; value?: string } }
  | { id: string; multiselect: Array<{ id?: string; externalReference?: string; value?: string }> }
  | { id: string; references: string[] }
  | { id: string; numeric: string }
  | { id: string; boolean: boolean }
  | { id: string; date: string }
  | { id: string; dateTime: string }
  | { id: string; richText: string }
  | { id: string; file: string };

interface AttributeHandlerContext {
  attribute: Attribute;
  attributeName: string;
  repository: ProductOperations;
  refs?: ReferenceResolvers;
}

// Strategy pattern for attribute handlers
abstract class AttributeHandler {
  abstract canHandle(inputType: string): boolean;
  abstract handle(
    value: string | string[],
    context: AttributeHandlerContext
  ): Promise<AttributeValueInputPayload | null> | AttributeValueInputPayload | null;

  protected normalizeToArray(value: string | string[]): string[] {
    return Array.isArray(value) ? value : [value];
  }
}

class PlainTextAttributeHandler extends AttributeHandler {
  canHandle(inputType: string): boolean {
    return inputType === ATTRIBUTE_INPUT_TYPES.PLAIN_TEXT;
  }

  handle(value: string | string[], context: AttributeHandlerContext): AttributeValueInputPayload {
    const vals = this.normalizeToArray(value);
    const first = vals[0] ?? "";
    return { id: context.attribute.id, plainText: first };
  }
}

class NumericAttributeHandler extends AttributeHandler {
  canHandle(inputType: string): boolean {
    return inputType === ATTRIBUTE_INPUT_TYPES.NUMERIC;
  }

  handle(value: string | string[], context: AttributeHandlerContext): AttributeValueInputPayload {
    const vals = this.normalizeToArray(value);
    const first = vals[0] ?? "";
    // Saleor expects numeric as string
    return { id: context.attribute.id, numeric: String(first) };
  }
}

class BooleanAttributeHandler extends AttributeHandler {
  canHandle(inputType: string): boolean {
    return inputType === ATTRIBUTE_INPUT_TYPES.BOOLEAN;
  }

  handle(value: string | string[], context: AttributeHandlerContext): AttributeValueInputPayload {
    const vals = this.normalizeToArray(value);
    const first = (vals[0] ?? "").toString().trim().toLowerCase();
    const truthy = ["true", "1", "yes", "y"]; // accept common forms
    const falsy = ["false", "0", "no", "n"];
    let boolValue: boolean | undefined;
    if (truthy.includes(first)) boolValue = true;
    if (falsy.includes(first)) boolValue = false;
    // Default: non-empty treated as true
    if (boolValue === undefined) boolValue = first.length > 0;
    return { id: context.attribute.id, boolean: boolValue };
  }
}

class DateAttributeHandler extends AttributeHandler {
  canHandle(inputType: string): boolean {
    return inputType === ATTRIBUTE_INPUT_TYPES.DATE;
  }

  handle(value: string | string[], context: AttributeHandlerContext): AttributeValueInputPayload {
    const vals = this.normalizeToArray(value);
    const first = vals[0] ?? "";
    // Expect ISO date (YYYY-MM-DD)
    return { id: context.attribute.id, date: first };
  }
}

class DateTimeAttributeHandler extends AttributeHandler {
  canHandle(inputType: string): boolean {
    return inputType === ATTRIBUTE_INPUT_TYPES.DATE_TIME;
  }

  handle(value: string | string[], context: AttributeHandlerContext): AttributeValueInputPayload {
    const vals = this.normalizeToArray(value);
    const first = vals[0] ?? "";
    // Expect ISO datetime
    return { id: context.attribute.id, dateTime: first };
  }
}

class RichTextAttributeHandler extends AttributeHandler {
  canHandle(inputType: string): boolean {
    return inputType === ATTRIBUTE_INPUT_TYPES.RICH_TEXT;
  }

  handle(value: string | string[], context: AttributeHandlerContext): AttributeValueInputPayload {
    const vals = this.normalizeToArray(value);
    const first = vals[0] ?? "";
    // Use provided JSON if it looks like JSON, otherwise wrap as simple EditorJS paragraph
    let jsonString = first;
    const trimmed = first.trim();
    if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      jsonString = JSON.stringify({
        time: Date.now(),
        blocks: [
          {
            id: `attr-${Date.now()}`,
            data: { text: first },
            type: "paragraph",
          },
        ],
        version: "2.24.3",
      });
    }
    return { id: context.attribute.id, richText: jsonString };
  }
}

class FileAttributeHandler extends AttributeHandler {
  canHandle(inputType: string): boolean {
    return inputType === ATTRIBUTE_INPUT_TYPES.FILE;
  }

  handle(value: string | string[], context: AttributeHandlerContext): AttributeValueInputPayload {
    const vals = this.normalizeToArray(value);
    const first = vals[0] ?? "";
    // Expect URL; contentType optional / not provided here
    return { id: context.attribute.id, file: first };
  }
}

class DropdownAttributeHandler extends AttributeHandler {
  canHandle(inputType: string): boolean {
    // Handle all choice-based attributes (single or multiple)
    return (
      inputType === ATTRIBUTE_INPUT_TYPES.DROPDOWN ||
      inputType === ATTRIBUTE_INPUT_TYPES.MULTISELECT ||
      inputType === ATTRIBUTE_INPUT_TYPES.SWATCH
    );
  }

  handle(
    value: string | string[],
    context: AttributeHandlerContext
  ): AttributeValueInputPayload | null {
    const valueNames = this.normalizeToArray(value);
    const resolved = valueNames.map((valueName) => {
      const choice = this.findChoice(valueName, context.attribute);
      if (choice) return { id: choice.node.id };
      // Fall back to create/resolve by value if not found
      logger.warn(
        `Choice "${valueName}" not found for attribute "${context.attributeName}", will use value-based resolution`
      );
      return { value: valueName } as { id?: string; value?: string };
    });

    // MULTISELECT => multiselect list, otherwise use dropdown/swatch single
    if (context.attribute.inputType === ATTRIBUTE_INPUT_TYPES.MULTISELECT) {
      return {
        id: context.attribute.id,
        multiselect: resolved,
      };
    }

      if (context.attribute.inputType === ATTRIBUTE_INPUT_TYPES.SWATCH) {
        return { id: context.attribute.id, swatch: resolved[0] };
      }

    // Default DROPDOWN (single value)
    return { id: context.attribute.id, dropdown: resolved[0] };
  }

  private findChoice(valueName: string, attribute: Attribute) {
    return attribute.choices?.edges?.find(
      (edge) => edge.node.name === valueName || edge.node.value === valueName
    );
  }
}

class ReferenceAttributeHandler extends AttributeHandler {
  canHandle(inputType: string): boolean {
    return inputType === ATTRIBUTE_INPUT_TYPES.REFERENCE;
  }

  async handle(
    value: string | string[],
    context: AttributeHandlerContext
  ): Promise<AttributeValueInputPayload | null> {
    const valueNames = this.normalizeToArray(value);
    const resolvedValues: string[] = [];

    for (const valueName of valueNames) {
      const resolvedId = await this.resolveReference(valueName, context);
      if (resolvedId) {
        resolvedValues.push(resolvedId);
      }
    }

    if (resolvedValues.length === 0) return null;
    return { id: context.attribute.id, references: resolvedValues };
  }

  private async resolveReference(
    valueName: string,
    context: AttributeHandlerContext
  ): Promise<string | null> {
    // Branch resolution by attribute entity type when available
    const entityType = (
      context.attribute as unknown as { entityType?: "PRODUCT" | "PRODUCT_VARIANT" | "PAGE" }
    )?.entityType;

    try {
      if (entityType === "PRODUCT") {
        const referencedProduct = await context.repository.getProductByName(valueName);
        if (referencedProduct) return referencedProduct.id;
      } else if (entityType === "PRODUCT_VARIANT") {
        const variant = await context.repository.getProductVariantBySku(valueName);
        if (variant) return variant.id;
      } else if (entityType === "PAGE") {
        if (context.refs?.getPageBySlug) {
          const page = await context.refs.getPageBySlug(valueName);
          if (page) return page.id;
        }
      } else {
        // Fallback: try product by name
        const referencedProduct = await context.repository.getProductByName(valueName);
        if (referencedProduct) return referencedProduct.id;
      }
    } catch (e) {
      logger.warn(
        `Failed to resolve reference for attribute "${context.attributeName}" value "${valueName}": ${e instanceof Error ? e.message : String(e)}`
      );
    }

    logger.warn(
      `Referenced entity "${valueName}" not found for attribute "${context.attributeName}"`
    );
    return null;
  }
}

// Main resolver class
export class AttributeResolver {
  private handlers: AttributeHandler[] = [
    // text-like
    new PlainTextAttributeHandler(),
    new RichTextAttributeHandler(),
    // scalar types
    new BooleanAttributeHandler(),
    new NumericAttributeHandler(),
    new DateAttributeHandler(),
    new DateTimeAttributeHandler(),
    // files and references
    new FileAttributeHandler(),
    new ReferenceAttributeHandler(),
    // choice-based
    new DropdownAttributeHandler(),
  ];

  constructor(private repository: ProductOperations, private refs?: ReferenceResolvers) {}

  setRefs(refs?: ReferenceResolvers) {
    this.refs = refs;
  }

  async resolveAttributes(
    attributes: Record<string, string | string[]> = {}
  ): Promise<AttributeValueInputPayload[]> {
    logger.debug("Resolving attribute values", { attributes });

    const resolvedAttributes: AttributeValueInputPayload[] = [];

    for (const [attributeName, attributeValue] of Object.entries(attributes)) {
      const resolved = await this.resolveAttribute(attributeName, attributeValue);
      if (resolved) {
        resolvedAttributes.push(resolved);
      }
    }

    logger.debug("Resolved attributes", {
      input: attributes,
      resolved: resolvedAttributes,
    });

    return resolvedAttributes;
  }

  private async resolveAttribute(
    attributeName: string,
    attributeValue: string | string[]
  ): Promise<AttributeValueInputPayload | null> {
    try {
      // Fetch attribute metadata
      const attribute = await this.fetchAttribute(attributeName);
      if (!attribute) return null;

      // Find appropriate handler
      if (!attribute.inputType) {
        logger.warn(`Attribute "${attributeName}" has no input type`);
        return null;
      }

      const handler = this.findHandler(attribute.inputType);
      if (!handler) {
        logger.warn(`Unsupported attribute input type: ${attribute.inputType}`);
        return null;
      }

      // Handle the attribute
      const context: AttributeHandlerContext = {
        attribute,
        attributeName,
        repository: this.repository,
        refs: this.refs,
      };

      const payload = await handler.handle(attributeValue, context);
      return payload;
    } catch (error) {
      this.logError(attributeName, attributeValue, error);
      return null;
    }
  }

  private async fetchAttribute(attributeName: string): Promise<Attribute | null> {
    // Use cache accessor if provided
    const cached = this.refs?.getAttributeByNameFromCache?.(attributeName);
    if (cached) return cached as Attribute;

    const attribute = await this.repository.getAttributeByName(attributeName);

    if (!attribute) {
      logger.warn(`Attribute "${attributeName}" not found, skipping`);
      return null;
    }

    return attribute;
  }

  private findHandler(inputType: string): AttributeHandler | null {
    return this.handlers.find((handler) => handler.canHandle(inputType)) || null;
  }

  private logError(attributeName: string, attributeValue: string | string[], error: unknown): void {
    logger.error(`Failed to resolve attribute "${attributeName}"`, {
      attributeName,
      attributeValue,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
