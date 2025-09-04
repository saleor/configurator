import { beforeEach, describe, expect, it } from "vitest";
import { ErrorRecoveryGuide, type RecoverySuggestion } from "./recovery-guide";

describe("ErrorRecoveryGuide", () => {
  describe("Pattern Matching", () => {
    describe("Attribute Errors", () => {
      it("should match entity type required error", () => {
        const errorMessage = "Entity type is required for reference attribute 'brand'";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        // This might match multiple patterns, so we check if at least one has the right fix
        expect(suggestions.length).toBeGreaterThan(0);
        const entityTypeSuggestion = suggestions.find((s) =>
          s.fix.includes("Add entityType field to the 'brand'")
        );
        expect(entityTypeSuggestion).toBeDefined();
        expect(entityTypeSuggestion?.check).toBe(
          "Valid values are: PAGE, PRODUCT, or PRODUCT_VARIANT"
        );
        expect(entityTypeSuggestion?.command).toBe("saleor-configurator diff --include=attributes");
      });

      it("should match attribute not found error", () => {
        const errorMessage = "Attribute 'color' not found";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe(
          "Create the attribute 'color' first or reference an existing one"
        );
        expect(suggestions[0].check).toBe("View available attributes");
        expect(suggestions[0].command).toBe("saleor-configurator introspect --include=attributes");
      });

      it("should match quoted attribute names", () => {
        const errorMessage = 'Attribute "size-guide" not found';
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe(
          "Create the attribute 'size-guide' first or reference an existing one"
        );
      });

      it("should match failed to resolve attributes error", () => {
        const errorMessage = "Failed to resolve referenced attributes in product type";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe(
          "Ensure referenced attributes exist and match the correct type (PRODUCT_TYPE or PAGE_TYPE)"
        );
        expect(suggestions[0].check).toBe("List all available attributes");
        expect(suggestions[0].command).toBe("saleor-configurator introspect --include=attributes");
      });
    });

    describe("Entity Not Found Errors", () => {
      it("should match category not found error", () => {
        const errorMessage = "Category 'Electronics/Phones' not found";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe(
          "Ensure category 'Electronics/Phones' exists or will be created earlier in deployment"
        );
        expect(suggestions[0].check).toBe("View existing categories");
        expect(suggestions[0].command).toBe("saleor-configurator introspect --include=categories");
      });

      it("should match channel not found error", () => {
        const errorMessage = 'Channel "default-channel" not found';
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe(
          "Ensure channel 'default-channel' exists or is defined in your config"
        );
        expect(suggestions[0].check).toBe("View existing channels");
        expect(suggestions[0].command).toBe("saleor-configurator introspect --include=channels");
      });

      it("should match product type not found error", () => {
        const errorMessage = "Product type 'T-Shirt' not found";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe(
          "Ensure product type 'T-Shirt' exists or is defined before products that use it"
        );
        expect(suggestions[0].check).toBe("View existing product types");
        expect(suggestions[0].command).toBe(
          "saleor-configurator introspect --include=productTypes"
        );
      });
    });

    describe("Duplicate/Conflict Errors", () => {
      it("should match duplicate slug error", () => {
        const errorMessage = "Duplicate slug 'electronics-phones'";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe("Use a unique slug - 'electronics-phones' already exists");
        expect(suggestions[0].check).toBe("View existing entities to find available slugs");
        expect(suggestions[0].command).toBe("saleor-configurator introspect");
      });

      it("should match entity already exists error", () => {
        const errorMessage = "Channel already exists with name 'US Store'";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe(
          "Entity with name 'US Store' already exists - use a different name or update the existing one"
        );
        expect(suggestions[0].check).toBe("View current state");
        expect(suggestions[0].command).toBe("saleor-configurator diff");
      });
    });

    describe("Validation Errors", () => {
      it("should match required field error", () => {
        const errorMessage = "slug is required";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe("Add the required field 'slug' to your configuration");
        expect(suggestions[0].check).toBe("Review the schema documentation");
        expect(suggestions[0].command).toBe("cat SCHEMA.md");
      });

      it("should match invalid value error", () => {
        const errorMessage = "Invalid currency value";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe(
          "Check that the currency field has a valid value according to the schema"
        );
        expect(suggestions[0].check).toBe("Review valid values in schema documentation");
      });
    });

    describe("Permission Errors", () => {
      it("should match permission denied error", () => {
        const errorMessage = "Permission denied: insufficient privileges";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe("Check that your API token has the required permissions");
        expect(suggestions[0].check).toBe("Verify token permissions in Saleor dashboard");
        expect(suggestions[0].command).toBe("saleor-configurator diff --token YOUR_TOKEN");
      });

      it("should match unauthorized error", () => {
        const errorMessage = "Unauthorized access";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe("Check that your API token has the required permissions");
      });

      it("should match forbidden error", () => {
        const errorMessage = "Forbidden: access denied";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe("Check that your API token has the required permissions");
      });
    });

    describe("Network Errors", () => {
      it("should match ECONNREFUSED error", () => {
        const errorMessage = "Error: connect ECONNREFUSED 127.0.0.1:8000";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe("Check your network connection and Saleor instance URL");
        expect(suggestions[0].check).toBe("Verify the instance is accessible");
        expect(suggestions[0].command).toBe("curl -I YOUR_SALEOR_URL/graphql/");
      });

      it("should match ETIMEDOUT error", () => {
        const errorMessage = "Request timeout ETIMEDOUT";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe("Check your network connection and Saleor instance URL");
      });

      it("should match ENOTFOUND error", () => {
        const errorMessage = "getaddrinfo ENOTFOUND api.example.com";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe("Check your network connection and Saleor instance URL");
      });
    });

    describe("GraphQL Errors", () => {
      it("should match GraphQL variable type error", () => {
        const errorMessage = 'Variable "$channelId" of type String! was provided invalid value';
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe(
          "Check the $channelId field type matches the GraphQL schema"
        );
        expect(suggestions[0].check).toBe(
          "This might be a version mismatch between configurator and Saleor"
        );
      });

      it("should match GraphQL variable with quotes", () => {
        const errorMessage =
          "Variable '$input' of type ProductCreateInput! was provided invalid value";
        const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].fix).toBe("Check the $input field type matches the GraphQL schema");
      });
    });
  });

  describe("Multiple Pattern Matching", () => {
    it("should return multiple suggestions when multiple patterns match", () => {
      const errorMessage = "slug is required and Attribute 'color' not found";
      const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

      expect(suggestions).toHaveLength(2);
      const slugSuggestion = suggestions.find((s) => s.fix.includes("required field 'slug'"));
      const colorSuggestion = suggestions.find((s) => s.fix.includes("attribute 'color'"));
      expect(slugSuggestion).toBeDefined();
      expect(colorSuggestion).toBeDefined();
    });

    it("should handle case-insensitive matching", () => {
      const errorMessage = "PERMISSION DENIED: Access forbidden";
      const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].fix).toBe("Check that your API token has the required permissions");
    });
  });

  describe("Fallback Suggestions", () => {
    it("should provide generic suggestion when no patterns match", () => {
      const errorMessage = "Some completely unknown error that doesn't match any pattern";
      const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].fix).toBe("Review the error message for details");
      expect(suggestions[0].check).toBe(
        "Check your configuration against the current Saleor state"
      );
      expect(suggestions[0].command).toBe("saleor-configurator diff --verbose");
    });

    it("should provide generic suggestion for empty error message", () => {
      const suggestions = ErrorRecoveryGuide.getSuggestions("");

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].fix).toBe("Review the error message for details");
    });
  });

  describe("Suggestion Formatting", () => {
    it("should format suggestions with all fields", () => {
      const suggestions: RecoverySuggestion[] = [
        {
          fix: "Create the missing attribute",
          check: "View existing attributes",
          command: "saleor-configurator introspect --include=attributes",
        },
      ];

      const formatted = ErrorRecoveryGuide.formatSuggestions(suggestions);

      expect(formatted).toEqual([
        "→ Fix: Create the missing attribute",
        "→ Check: View existing attributes",
        "→ Run: saleor-configurator introspect --include=attributes",
      ]);
    });

    it("should format suggestions with only fix field", () => {
      const suggestions: RecoverySuggestion[] = [
        {
          fix: "Add the required field to your config",
        },
      ];

      const formatted = ErrorRecoveryGuide.formatSuggestions(suggestions);

      expect(formatted).toEqual(["→ Fix: Add the required field to your config"]);
    });

    it("should format suggestions with partial fields", () => {
      const suggestions: RecoverySuggestion[] = [
        {
          fix: "Fix the issue",
          command: "saleor-configurator diff",
        },
      ];

      const formatted = ErrorRecoveryGuide.formatSuggestions(suggestions);

      expect(formatted).toEqual(["→ Fix: Fix the issue", "→ Run: saleor-configurator diff"]);
    });

    it("should format multiple suggestions", () => {
      const suggestions: RecoverySuggestion[] = [
        {
          fix: "First suggestion",
          check: "Check something",
        },
        {
          fix: "Second suggestion",
          command: "run-command",
        },
      ];

      const formatted = ErrorRecoveryGuide.formatSuggestions(suggestions);

      expect(formatted).toEqual([
        "→ Fix: First suggestion",
        "→ Check: Check something",
        "→ Fix: Second suggestion",
        "→ Run: run-command",
      ]);
    });

    it("should handle empty suggestions array", () => {
      const formatted = ErrorRecoveryGuide.formatSuggestions([]);

      expect(formatted).toEqual([]);
    });
  });

  describe("Custom Pattern Registration", () => {
    beforeEach(() => {
      // Note: Since patterns is a private static property, we can't easily reset it
      // In a real implementation, you might want to add a reset method for testing
    });

    it("should allow registering custom patterns", () => {
      const customPattern = /Custom error: (\w+)/i;
      const getSuggestion = (match: RegExpMatchArray): RecoverySuggestion => ({
        fix: `Handle custom error for ${match[1]}`,
        check: "This is a custom error pattern",
        command: "custom-command",
      });

      ErrorRecoveryGuide.registerPattern(customPattern, getSuggestion);

      const suggestions = ErrorRecoveryGuide.getSuggestions("Custom error: TestEntity");

      // Should find both the new custom pattern and any other patterns that might match
      const customSuggestion = suggestions.find((s) =>
        s.fix.includes("Handle custom error for TestEntity")
      );
      expect(customSuggestion).toBeDefined();
      expect(customSuggestion?.check).toBe("This is a custom error pattern");
      expect(customSuggestion?.command).toBe("custom-command");
    });

    it("should handle custom pattern with complex logic", () => {
      const complexPattern = /Entity (\w+) failed validation: (.+)/i;
      const getSuggestion = (match: RegExpMatchArray): RecoverySuggestion => ({
        fix: `Fix ${match[1]} validation: ${match[2]}`,
        check: `Review ${match[1]} schema requirements`,
        command: `saleor-configurator introspect --include=${match[1].toLowerCase()}`,
      });

      ErrorRecoveryGuide.registerPattern(complexPattern, getSuggestion);

      const suggestions = ErrorRecoveryGuide.getSuggestions(
        "Entity Product failed validation: slug is required"
      );

      const customSuggestion = suggestions.find((s) => s.fix.includes("Fix Product validation"));
      expect(customSuggestion).toBeDefined();
      expect(customSuggestion?.fix).toBe("Fix Product validation: slug is required");
      expect(customSuggestion?.check).toBe("Review Product schema requirements");
      expect(customSuggestion?.command).toBe("saleor-configurator introspect --include=product");
    });
  });

  describe("Real-World Error Scenarios", () => {
    it("should provide helpful suggestions for attribute reference errors", () => {
      const errorMessage = "Entity type is required for reference attribute 'brand-reference'";
      const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

      expect(suggestions.length).toBeGreaterThan(0);
      const attributeSuggestion = suggestions.find((s) =>
        s.fix.includes("entityType field to the 'brand-reference'")
      );
      expect(attributeSuggestion).toBeDefined();
      expect(attributeSuggestion?.check).toBe(
        "Valid values are: PAGE, PRODUCT, or PRODUCT_VARIANT"
      );
    });

    it("should provide helpful suggestions for deployment ordering issues", () => {
      const errorMessage =
        "Category 'Electronics/Smartphones/iPhone' not found when creating product";
      const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].fix).toBe(
        "Ensure category 'Electronics/Smartphones/iPhone' exists or will be created earlier in deployment"
      );
      expect(suggestions[0].command).toBe("saleor-configurator introspect --include=categories");
    });

    it("should provide network troubleshooting for connection issues", () => {
      const errorMessage = "Failed to connect to https://mystore.saleor.cloud: ECONNREFUSED";
      const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].fix).toBe("Check your network connection and Saleor instance URL");
      expect(suggestions[0].command).toBe("curl -I YOUR_SALEOR_URL/graphql/");
    });

    it("should provide permission guidance for auth issues", () => {
      const errorMessage =
        "GraphQL Error: Permission denied. User does not have permission to manage products.";
      const suggestions = ErrorRecoveryGuide.getSuggestions(errorMessage);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].fix).toBe("Check that your API token has the required permissions");
      expect(suggestions[0].check).toBe("Verify token permissions in Saleor dashboard");
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined error message", () => {
      // @ts-expect-error Testing edge case
      const suggestions = ErrorRecoveryGuide.getSuggestions(undefined);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].fix).toBe("Review the error message for details");
    });

    it("should handle null error message", () => {
      // @ts-expect-error Testing edge case
      const suggestions = ErrorRecoveryGuide.getSuggestions(null);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].fix).toBe("Review the error message for details");
    });

    it("should handle very long error messages", () => {
      const longMessage =
        "This is a very long error message that doesn't match any patterns ".repeat(100);
      const suggestions = ErrorRecoveryGuide.getSuggestions(longMessage);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].fix).toBe("Review the error message for details");
    });

    it("should handle error messages with special characters", () => {
      const specialMessage = "Error: Invalid value for field 'name' with characters: @#$%^&*()[]{}";
      const suggestions = ErrorRecoveryGuide.getSuggestions(specialMessage);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].fix).toBe("Review the error message for details");
    });
  });
});
