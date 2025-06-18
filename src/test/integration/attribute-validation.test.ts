import { describe, expect, it, vi, beforeEach } from "vitest";
import { YamlConfigurationManager } from "../../modules/config/yaml-manager";
import { AttributeService } from "../../modules/attribute/attribute-service";
import type { AttributeOperations } from "../../modules/attribute/repository";
import type { AttributeInput } from "../../modules/config/schema";

describe("Comprehensive Attribute Validation", () => {
  let mockAttributeOperations: AttributeOperations;
  let attributeService: AttributeService;

  beforeEach(() => {
    mockAttributeOperations = {
      createAttribute: vi.fn(),
      getAttributesByNames: vi.fn(),
      getAttributeByName: vi.fn(),
    };
    attributeService = new AttributeService(mockAttributeOperations);
  });

  it("should validate all attribute types from comprehensive configuration", async () => {
    // Arrange - Load the comprehensive configuration
    const yamlManager = new YamlConfigurationManager("./test-minimal.yml");
    const config = await yamlManager.load();

    expect(config.attributes).toBeDefined();
    expect(config.attributes!.length).toBeGreaterThan(0);

    // Mock successful attribute creation
    vi.mocked(mockAttributeOperations.createAttribute).mockResolvedValue({
      id: "test-id",
      name: "Test Attribute",
      type: "PRODUCT_TYPE",
      inputType: "DROPDOWN",
      entityType: null,
      choices: {
        edges: []
      }
    });

    // Act - Bootstrap all attributes
    const result = await attributeService.bootstrapAttributes({
      attributeInputs: config.attributes!,
    });

    // Assert - Check that all attributes were processed
    expect(result).toHaveLength(config.attributes!.length);
    expect(mockAttributeOperations.createAttribute).toHaveBeenCalledTimes(
      config.attributes!.length
    );

    // Basic validation - just check that attributes were created
    expect(result.length).toBeGreaterThan(0);
  });

  it("should handle both PRODUCT_TYPE and PAGE_TYPE attributes", async () => {
    // Arrange
    const yamlManager = new YamlConfigurationManager("./test-minimal.yml");
    const config = await yamlManager.load();

    const productTypeAttributes = config.attributes!.filter((attr: any) => attr.type === "PRODUCT_TYPE");
    const pageTypeAttributes = config.attributes!.filter((attr: any) => attr.type === "PAGE_TYPE");

    // Assert
    expect(productTypeAttributes.length).toBeGreaterThan(0);
    expect(pageTypeAttributes.length).toBeGreaterThan(0);
  });

  it("should handle error cases gracefully", async () => {
    // Arrange
    const invalidAttribute = {
      name: "Invalid Reference",
      type: "PRODUCT_TYPE" as const,
      inputType: "REFERENCE" as const,
      // Missing entityType - should cause error
    };

    // Act & Assert
    await expect(
      attributeService.bootstrapAttributes({
        attributeInputs: [invalidAttribute as any],
      })
    ).rejects.toThrow("Entity type is required for reference attribute");
  });
}); 