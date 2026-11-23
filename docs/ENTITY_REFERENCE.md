# Entities

Every field of every section is listed in [SCHEMA.md](../SCHEMA.md). This page covers how entities are identified and how they refer to each other.

## Identifiers

`diff` and `deploy` match each entry in `config.yml` to an entity in the store by one field. Changing that field makes the entry a new entity, and the old one is reported as a deletion.

| Identifier | Sections |
|---|---|
| `slug` | `channels`, `warehouses`, `categories`, `collections`, `products`, `models`, `menus`, `customerTypes` |
| `name` | `productAttributes`, `contentAttributes`, `customerAttributes`, `productTypes`, `pageTypes`, `modelTypes`, `taxClasses`, `shippingZones` |
| none | `shop` (one per store) |

## References

References use the identifier of the referenced entity. It must be defined in the same file or already exist in the store.

| Field | Refers to |
|---|---|
| `products[].productType` | product type name |
| `products[].category` | category slug |
| `products[].taxClass`, `productTypes[].taxClass` | tax class name |
| channel listings (`channel`) | channel slug |
| `warehouses[].shippingZones` | shipping zone names |
| `shippingZones[].warehouses`, `shippingZones[].channels` | warehouse slugs, channel slugs |
| `collections[].products` | product slugs |
| `menus[].items[].category`, `.collection`, `.page` | category, collection or model slug |
| `models[].modelType` | model type name |
| `customerTypes[].attributes` | attribute names from `customerAttributes` |

## Attributes

Attributes can be defined once and reused. Define them in `productAttributes` (for product and variant attributes), `contentAttributes` (for model and page types) or `customerAttributes`, then refer to them by name:

```yaml
productAttributes:
  - name: Author
    inputType: PLAIN_TEXT

productTypes:
  - name: Book
    productAttributes:
      - attribute: Author
```

An attribute can also be defined inline in a product type with `name` and `inputType`, and later types can reuse it with `attribute: <name>`.

`REFERENCE` and `SINGLE_REFERENCE` attributes need an `entityType`: `PAGE` (models), `PRODUCT`, `PRODUCT_VARIANT`, `CATEGORY` or `COLLECTION`.

## Models and pages

Saleor's Dashboard calls content entries *models* and their templates *model types*; the GraphQL API calls them pages and page types. In `config.yml`, entries go in `models` and templates in `modelTypes` or `pageTypes`.
