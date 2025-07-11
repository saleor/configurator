import { logger } from "../../lib/logger";
import type { Attribute, ProductOperations } from "./repository";

// Constants
const ATTRIBUTE_INPUT_TYPES = {
  PLAIN_TEXT: "PLAIN_TEXT",
  DROPDOWN: "DROPDOWN",
  REFERENCE: "REFERENCE",
} as const;

type AttributeInputType = keyof typeof ATTRIBUTE_INPUT_TYPES;

// Types
interface AttributeValue {
  id: string;
  values: string[];
}

interface AttributeHandlerContext {
  attribute: Attribute;
  attributeName: string;
  repository: ProductOperations;
}

// Strategy pattern for attribute handlers
abstract class AttributeHandler {
  abstract canHandle(inputType: string): boolean;
  abstract handle(
    value: string | string[],
    context: AttributeHandlerContext
  ): Promise<string[]> | string[];

  protected normalizeToArray(value: string | string[]): string[] {
    return Array.isArray(value) ? value : [value];
  }
}

class PlainTextAttributeHandler extends AttributeHandler {
  canHandle(inputType: string): boolean {
    return inputType === ATTRIBUTE_INPUT_TYPES.PLAIN_TEXT;
  }

  handle(value: string | string[]): string[] {
    return this.normalizeToArray(value);
  }
}

class DropdownAttributeHandler extends AttributeHandler {
  canHandle(inputType: string): boolean {
    return inputType === ATTRIBUTE_INPUT_TYPES.DROPDOWN;
  }

  handle(value: string | string[], context: AttributeHandlerContext): string[] {
    const valueNames = this.normalizeToArray(value);
    const resolvedValues: string[] = [];

    for (const valueName of valueNames) {
      const choice = this.findChoice(valueName, context.attribute);
      if (choice) {
        resolvedValues.push(choice.node.id);
      } else {
        logger.warn(`Choice "${valueName}" not found for attribute "${context.attributeName}"`);
      }
    }

    return resolvedValues;
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

  async handle(value: string | string[], context: AttributeHandlerContext): Promise<string[]> {
    const valueNames = this.normalizeToArray(value);
    const resolvedValues: string[] = [];

    for (const valueName of valueNames) {
      const resolvedId = await this.resolveReference(valueName, context);
      if (resolvedId) {
        resolvedValues.push(resolvedId);
      }
    }

    return resolvedValues;
  }

  private async resolveReference(
    valueName: string,
    context: AttributeHandlerContext
  ): Promise<string | null> {
    // Try to resolve as product name (most common case)
    const referencedProduct = await context.repository.getProductByName(valueName);

    if (referencedProduct) {
      return referencedProduct.id;
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
    new PlainTextAttributeHandler(),
    new DropdownAttributeHandler(),
    new ReferenceAttributeHandler(),
  ];

  constructor(private repository: ProductOperations) {}

  async resolveAttributes(
    attributes: Record<string, string | string[]> = {}
  ): Promise<AttributeValue[]> {
    logger.debug("Resolving attribute values", { attributes });

    const resolvedAttributes: AttributeValue[] = [];

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
  ): Promise<AttributeValue | null> {
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
      };

      const values = await handler.handle(attributeValue, context);

      // Return if we have values
      if (values.length > 0) {
        return { id: attribute.id, values };
      }

      return null;
    } catch (error) {
      this.logError(attributeName, attributeValue, error);
      return null;
    }
  }

  private async fetchAttribute(attributeName: string): Promise<Attribute | null> {
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
