import { configurator } from "./setup";

// Example configuration
configurator.bootstrap({
  productTypes: [
    {
      name: "Sweets",
      attributes: [
        {
          name: "Brand",
          inputType: "PLAIN_TEXT",
        },
        {
          name: "Flavor",
          inputType: "MULTISELECT",
          values: [
            { name: "Fiction" },
            { name: "Non-Fiction" },
            { name: "Fantasy" },
          ],
        },
        {
          name: "Sugar Content",
          inputType: "DROPDOWN",
          values: [{ name: "Low" }, { name: "Medium" }, { name: "High" }],
        },
        {
          name: "Is Organic",
          inputType: "BOOLEAN",
        },
      ],
    },
  ],
  channels: [
    {
      name: "Atlantis",
      currencyCode: "USD",
      defaultCountry: "US",
      slug: "atlantis",
    },
  ],
  pageTypes: [
    {
      name: "Blog Post",
      attributes: [
        { name: "Title", inputType: "PLAIN_TEXT" },
        { name: "Description", inputType: "PLAIN_TEXT" },
        { name: "Writer", inputType: "PLAIN_TEXT" },
        {
          name: "Tags",
          inputType: "DROPDOWN",
          values: [
            { name: "Technology" },
            { name: "Science" },
            { name: "Health" },
          ],
        },
        { name: "Published Date", inputType: "DATE" },
      ],
    },
  ],
  attributes: [
    {
      name: "Color",
      inputType: "SWATCH",
      values: [{ name: "Red" }],
      type: "PRODUCT_TYPE",
    },
  ],
});
