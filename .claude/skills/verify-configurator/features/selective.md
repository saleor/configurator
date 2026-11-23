# Selective sections

`--include` and `--exclude` limit introspect, deploy and diff to some sections. Users use them to manage part of a store, and the upgrade check uses them on the shared sandbox.

## Sub-features

- `selective-introspect`: `--include` writes only those sections; `--exclude` writes all but those.
- `selective-deploy`: deploy with `--include` touches only those sections even when the file has more.
- `selective-diff`: diff with `--exclude` hides those sections.
- `selective-invalid`: an unknown section name is rejected with the list of valid ones.

## How to get to it (user POV)

`--include=categories,products`, `--exclude=shop`, on introspect, deploy and diff.

## Driving it with verify-configurator

- `cli -- introspect --include=categories --config=only-categories.yml` → the file's only top-level key is `categories`.
- Copy the seed, change the product's description and add a subcategory, `cli -- deploy --config=sel.yml --include=categories` → the subcategory exists and the product keeps its old description. (A category rename would not show, see the known failures.)
- `cli -- diff --config=sel.yml --exclude=categories` → shows the product change, not the category.
- `cli -- diff --config=seed.yml --include=nonsense` → error naming the valid sections.
- **Proof:** `gql` reads both objects after the selective deploy: the category has the new value, the product the old one. Then a full-section deploy reports exactly the remaining product change.

## Gotchas

- Valid section names are in `src/lib/utils/selective-options.ts` (`AVAILABLE_SECTIONS`).
