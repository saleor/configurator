# Recipes

`recipe` lists, shows and applies pre-built configurations (`recipes/`). Users apply one to start a store, so a recipe that doesn't deploy cleanly is a first-run failure.

## Sub-features

- `recipe-list`, `recipe-show`: list and print recipes.
- `recipe-apply-plan`: applying with `--plan` lists the changes and writes nothing.
- `recipe-apply`: applying one deploys it (only with a prefixed copy; see Gotchas).

## How to get to it (user POV)

`configurator recipe list`, `configurator recipe show <name>`, `configurator recipe apply <name> --url … --token …`.

## Driving it with verify-configurator

- `cli -- recipe list` → every directory under `recipes/` is listed.
- `cli -- recipe show multi-region` → the YAML prints.
- `cli -- recipe apply multi-region --plan` → a plan, and `gql` shows none of its channels exist afterwards.
- To deploy a recipe for real, `cli -- recipe export multi-region --output=recipe.yml`, prefix every slug and name with `<prefix>`, and `cli -- deploy --config=recipe.yml`.
- **Proof:** `gql` reads two objects from the deployed recipe (a channel and a product type) and compares them with the file. Then idempotency and round trip as usual.

## Gotchas

- Every `recipe` subcommand fails in the built CLI today (known failure). Record `recipe-list` failed with the transcript and the rest blocked; `pnpm dev recipe list` working is not proof (V4).

- Applying a recipe unprefixed writes unprefixed channels and types to the shared sandbox that `down` can't find. Always prefix.
- Recipes are copied into `dist/` at build time; a recipe change needs a fresh `up`.
