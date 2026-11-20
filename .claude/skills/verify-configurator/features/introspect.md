# Introspect

`introspect` reads the store and writes `config.yml`. Users run it first, and again to pull changes made in the Dashboard. Everything later depends on the file it writes being complete and deployable.

## Sub-features

- `introspect-seeded`: the seeded sections come back with every field the seed set.
- `introspect-dashboard-change`: a change made outside the CLI appears in the next introspect.
- `introspect-overwrite`: introspecting over an existing file replaces it (with a backup when the CLI makes one).

## How to get to it (user POV)

`configurator introspect --url <store>/graphql/ --token <app token>` in a project directory; `--config` picks the file.

## Driving it with verify-configurator

- Introspect the seeded sections: `cli -- introspect --include=channels,warehouses,productAttributes,productTypes,categories,collections,products --config=introspected.yml` → exit 0, file written.
- Check the seed is in it: `grep -n "<prefix>" work/introspected.yml` → every seeded object appears, the product with its media `externalUrl`, variant SKU and channel listing.
- Change something outside the CLI: `gql 'mutation($id: ID!) { categoryUpdate(id: $id, input: {description: "{\"blocks\":[{\"type\":\"paragraph\",\"data\":{\"text\":\"changed\"}}]}"}) { errors { message } } }' --vars '{"id":"<category id>"}'` (seeding the outside change is what `gql` is for), then introspect again → the new description is in the file.
- **Proof:** compare the file's values for `<prefix>-tee` with `gql '{ product(slug: "<prefix>-tee") { name category { slug } productType { name } media { url metadata { key value } } variants { sku channelListings { channel { slug } price { amount } } } } }'`. Then `cli -- diff --include=<same sections> --config=introspected.yml` → `result.summary.totalChanges: 0`.

## Gotchas

- On the seed, the collection's `products` and the media `externalUrl` come back wrong (known failures in the README): the file shows `products: []` and Saleor's thumbnail URL.

- Without `--include` the file contains everything on the shared sandbox.
- The media URL in the file comes from the `configurator.externalUrl` metadata key the CLI stored at deploy, not from Saleor's thumbnail URL.
