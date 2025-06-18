import { describe, it, expect, vi, beforeEach } from "vitest";
import { TranslationService } from "./translation-service";
import type { TranslationRepository } from "./repository";

// Mock dependencies
const mockRepository = {
  translateProduct: vi.fn(),
  translateCollection: vi.fn(),
  translateCategory: vi.fn(),
  translateProductVariant: vi.fn(),
  translatePage: vi.fn(),
  translateShippingMethod: vi.fn(),
  translateMenuItem: vi.fn(),
  translateAttribute: vi.fn(),
  translateAttributeValue: vi.fn(),
} as unknown as TranslationRepository;

const mockProductService = {
  getProducts: vi.fn(() => Promise.resolve([
    { id: "1", slug: "test-product", name: "Test Product", variants: [{ id: "v1", sku: "SKU-001" }] }
  ])),
};

const mockCollectionService = {
  getCollections: vi.fn(() => Promise.resolve([
    { id: "1", slug: "test-collection", name: "Test Collection" }
  ])),
};

const mockCategoryService = {
  getCategories: vi.fn(() => Promise.resolve([
    { id: "1", slug: "test-category", name: "Test Category" }
  ])),
};

const mockPageService = {
  getPages: vi.fn(() => Promise.resolve([
    { id: "1", slug: "test-page", title: "Test Page" }
  ])),
};

const mockShippingService = {
  getShippingZones: vi.fn(() => Promise.resolve([
    { id: "1", name: "Zone 1", shippingMethods: [{ id: "m1", name: "Standard Shipping" }] }
  ])),
};

const mockMenuService = {
  getMenus: vi.fn(() => Promise.resolve([
    { id: "1", name: "Main Menu", items: [{ id: "mi1", name: "Home" }] }
  ])),
};

const mockAttributeService = {
  getAttributes: vi.fn(() => Promise.resolve([
    { id: "1", slug: "color", name: "Color", values: [{ id: "av1", slug: "red" }] }
  ])),
};

describe("TranslationService", () => {
  let translationService: TranslationService;

  beforeEach(() => {
    vi.clearAllMocks();
    translationService = new TranslationService(
      mockRepository,
      mockProductService as any,
      mockCollectionService as any,
      mockCategoryService as any,
      mockPageService as any,
      mockShippingService as any,
      mockMenuService as any,
      mockAttributeService as any
    );
  });

  describe("applyTranslations", () => {
    it("should apply product translations", async () => {
      // Arrange
      const translations = [{
        entityType: "product" as const,
        entityIdentifier: "test-product",
        languageCode: "ES",
        translations: {
          name: "Producto de Prueba",
          description: "Descripción del producto",
        }
      }];

      vi.mocked(mockRepository.translateProduct).mockResolvedValue({ id: "1" });

      // Act
      await translationService.applyTranslations(translations);

      // Assert
      expect(mockProductService.getProducts).toHaveBeenCalled();
      expect(mockRepository.translateProduct).toHaveBeenCalledWith(
        "1",
        "ES",
        {
          name: "Producto de Prueba",
          description: "Descripción del producto",
          seoTitle: undefined,
          seoDescription: undefined,
        }
      );
    });

    it("should apply collection translations", async () => {
      // Arrange
      const translations = [{
        entityType: "collection" as const,
        entityIdentifier: "test-collection",
        languageCode: "FR",
        translations: {
          name: "Collection de Test",
          description: "Description de la collection",
        }
      }];

      vi.mocked(mockRepository.translateCollection).mockResolvedValue({ id: "1" });

      // Act
      await translationService.applyTranslations(translations);

      // Assert
      expect(mockCollectionService.getCollections).toHaveBeenCalled();
      expect(mockRepository.translateCollection).toHaveBeenCalledWith(
        "1",
        "FR",
        {
          name: "Collection de Test",
          description: "Description de la collection",
          seoTitle: undefined,
          seoDescription: undefined,
        }
      );
    });

    it("should apply category translations", async () => {
      // Arrange
      const translations = [{
        entityType: "category" as const,
        entityIdentifier: "test-category",
        languageCode: "DE",
        translations: {
          name: "Testkategorie",
          description: "Kategoriebeschreibung",
        }
      }];

      vi.mocked(mockRepository.translateCategory).mockResolvedValue({ id: "1" });

      // Act
      await translationService.applyTranslations(translations);

      // Assert
      expect(mockCategoryService.getCategories).toHaveBeenCalled();
      expect(mockRepository.translateCategory).toHaveBeenCalledWith(
        "1",
        "DE",
        {
          name: "Testkategorie",
          description: "Kategoriebeschreibung",
          seoTitle: undefined,
          seoDescription: undefined,
        }
      );
    });

    it("should apply product variant translations", async () => {
      // Arrange
      const translations = [{
        entityType: "variant" as const,
        entityIdentifier: "SKU-001",
        languageCode: "IT",
        translations: {
          name: "Variante di Prova",
        }
      }];

      vi.mocked(mockRepository.translateProductVariant).mockResolvedValue({ id: "v1" });

      // Act
      await translationService.applyTranslations(translations);

      // Assert
      expect(mockProductService.getProducts).toHaveBeenCalled();
      expect(mockRepository.translateProductVariant).toHaveBeenCalledWith(
        "v1",
        "IT",
        { name: "Variante di Prova" }
      );
    });

    it("should apply page translations", async () => {
      // Arrange
      const translations = [{
        entityType: "page" as const,
        entityIdentifier: "test-page",
        languageCode: "PL",
        translations: {
          title: "Strona Testowa",
          content: "Treść strony",
        }
      }];

      vi.mocked(mockRepository.translatePage).mockResolvedValue({ id: "1" });

      // Act
      await translationService.applyTranslations(translations);

      // Assert
      expect(mockPageService.getPages).toHaveBeenCalled();
      expect(mockRepository.translatePage).toHaveBeenCalledWith(
        "1",
        "PL",
        {
          title: "Strona Testowa",
          content: "Treść strony",
          seoTitle: undefined,
          seoDescription: undefined,
        }
      );
    });

    it("should apply shipping method translations", async () => {
      // Arrange
      const translations = [{
        entityType: "shipping" as const,
        entityIdentifier: "Standard Shipping",
        languageCode: "ES",
        translations: {
          name: "Envío Estándar",
          description: "Método de envío estándar",
        }
      }];

      vi.mocked(mockRepository.translateShippingMethod).mockResolvedValue({ id: "m1" });

      // Act
      await translationService.applyTranslations(translations);

      // Assert
      expect(mockShippingService.getShippingZones).toHaveBeenCalled();
      expect(mockRepository.translateShippingMethod).toHaveBeenCalledWith(
        "m1",
        "ES",
        {
          name: "Envío Estándar",
          description: "Método de envío estándar",
        }
      );
    });

    it("should apply menu item translations", async () => {
      // Arrange
      const translations = [{
        entityType: "menuItem" as const,
        entityIdentifier: "Home",
        languageCode: "FR",
        translations: {
          name: "Accueil",
        }
      }];

      vi.mocked(mockRepository.translateMenuItem).mockResolvedValue({ id: "mi1" });

      // Act
      await translationService.applyTranslations(translations);

      // Assert
      expect(mockMenuService.getMenus).toHaveBeenCalled();
      expect(mockRepository.translateMenuItem).toHaveBeenCalledWith(
        "mi1",
        "FR",
        { name: "Accueil" }
      );
    });

    it("should apply attribute translations", async () => {
      // Arrange
      const translations = [{
        entityType: "attribute" as const,
        entityIdentifier: "color",
        languageCode: "ES",
        translations: {
          name: "Color",
        }
      }];

      vi.mocked(mockRepository.translateAttribute).mockResolvedValue({ id: "1" });

      // Act
      await translationService.applyTranslations(translations);

      // Assert
      expect(mockAttributeService.getAttributes).toHaveBeenCalled();
      expect(mockRepository.translateAttribute).toHaveBeenCalledWith(
        "1",
        "ES",
        { name: "Color" }
      );
    });

    it("should apply attribute value translations", async () => {
      // Arrange
      const translations = [{
        entityType: "attributeValue" as const,
        entityIdentifier: "color:red",
        languageCode: "ES",
        translations: {
          name: "Rojo",
        }
      }];

      vi.mocked(mockRepository.translateAttributeValue).mockResolvedValue({ id: "av1" });

      // Act
      await translationService.applyTranslations(translations);

      // Assert
      expect(mockAttributeService.getAttributes).toHaveBeenCalled();
      expect(mockRepository.translateAttributeValue).toHaveBeenCalledWith(
        "av1",
        "ES",
        {
          name: "Rojo",
          richText: undefined,
          plainText: undefined,
        }
      );
    });

    it("should handle multiple translations of different types", async () => {
      // Arrange
      const translations = [
        {
          entityType: "product" as const,
          entityIdentifier: "test-product",
          languageCode: "ES",
          translations: { name: "Producto" }
        },
        {
          entityType: "category" as const,
          entityIdentifier: "test-category",
          languageCode: "ES",
          translations: { name: "Categoría" }
        }
      ];

      vi.mocked(mockRepository.translateProduct).mockResolvedValue({ id: "1" });
      vi.mocked(mockRepository.translateCategory).mockResolvedValue({ id: "1" });

      // Act
      const results = await translationService.applyTranslations(translations);

      // Assert
      expect(results).toHaveLength(2);
      expect(mockRepository.translateProduct).toHaveBeenCalled();
      expect(mockRepository.translateCategory).toHaveBeenCalled();
    });

    it("should skip translations for non-existent entities", async () => {
      // Arrange
      const translations = [{
        entityType: "product" as const,
        entityIdentifier: "non-existent-product",
        languageCode: "ES",
        translations: { name: "Producto" }
      }];

      // Act
      const results = await translationService.applyTranslations(translations);

      // Assert
      expect(results).toHaveLength(0);
      expect(mockRepository.translateProduct).not.toHaveBeenCalled();
    });

    it("should throw error for unknown entity type", async () => {
      // Arrange
      const translations = [{
        entityType: "unknown" as any,
        entityIdentifier: "test",
        languageCode: "ES",
        translations: { name: "Test" }
      }];

      // Act & Assert
      const results = await translationService.applyTranslations(translations);
      expect(results).toHaveLength(0);
    });

    it("should handle errors during translation", async () => {
      // Arrange
      const translations = [{
        entityType: "product" as const,
        entityIdentifier: "test-product",
        languageCode: "ES",
        translations: { name: "Producto" }
      }];

      vi.mocked(mockRepository.translateProduct).mockRejectedValue(new Error("API Error"));

      // Act & Assert
      await expect(translationService.applyTranslations(translations))
        .rejects.toThrow("API Error");
    });
  });

  describe("getTranslations", () => {
    it("should throw not implemented error", async () => {
      // Act & Assert
      await expect(translationService.getTranslations("product", "1", "ES"))
        .rejects.toThrow("Not implemented yet");
    });
  });
}); 