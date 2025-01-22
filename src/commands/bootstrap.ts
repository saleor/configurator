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
});
