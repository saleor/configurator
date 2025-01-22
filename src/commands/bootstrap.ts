import { configurator } from "./setup";

// Example configuration
configurator.bootstrap({
  productTypes: [
    {
      name: "Books",
      attributes: [
        {
          name: "Author",
          inputType: "PLAIN_TEXT",
        },
        {
          name: "Genre",
          inputType: "DROPDOWN",
          values: [
            { name: "Fiction" },
            { name: "Non-Fiction" },
            { name: "Fantasy" },
          ],
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
        { name: "Author", inputType: "PLAIN_TEXT" },
        {
          name: "Tags",
          inputType: "DROPDOWN",
          values: [
            { name: "Technology" },
            { name: "Science" },
            { name: "Health" },
          ],
        },
      ],
    },
  ],
});
