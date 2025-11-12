---
"@saleor/configurator": patch
---

Fix menu items not linking to categories when created via configurator.

Menu items specified with category slugs (e.g., `category: "photobooks"`) now properly resolve to category IDs and link correctly in Saleor. Previously, the MenuService was missing required dependencies (CategoryService, CollectionService, ModelService), causing category resolution to be skipped and resulting in `category: null` in the API response.

This fix ensures menu structures work correctly in storefronts by injecting the necessary services during MenuService initialization.
