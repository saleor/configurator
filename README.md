# Saleor Configurator

[![npm version](https://img.shields.io/npm/v/@saleor/configurator.svg)](https://www.npmjs.com/package/@saleor/configurator)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Define a [Saleor](https://saleor.io) store's configuration in YAML, keep it in Git, and sync it with the store. `introspect` writes the store to `config.yml`, `diff` shows what would change, and `deploy` applies the file.

## Compatibility

Configurator versions follow Saleor versions: configurator `3.23.x` targets Saleor `3.23.x`. The target is declared in `package.json#saleor.schemaVersion`. Other Saleor minors may work; `introspect`, `diff` and `deploy` print a warning when the connected store reports a different minor.

Requires Node.js 20 or later.

## Getting started

### 1. Create a token

In the Saleor Dashboard, go to **Extensions**, add an extension with **Provide details manually**, grant it all permissions, and create a token on its page. The token is shown once.

### 2. Point the CLI at your store

Pass `--url` and `--token` to each command, or set them once:

```bash
export SALEOR_URL="https://your-store.saleor.cloud/graphql/"
export SALEOR_TOKEN="your-token"
```

The CLI also reads these from `.env` and `.env.local` in the current directory. Keep tokens out of version control.

### 3. Sync

```bash
npx @saleor/configurator introspect   # write the store to config.yml
# edit config.yml
npx @saleor/configurator diff         # preview the changes
npx @saleor/configurator deploy       # apply them
```

`npx @saleor/configurator start` runs the same steps as an interactive wizard. Every command and flag is listed in [docs/COMMANDS.md](docs/COMMANDS.md).

## Configuration

```yaml
shop:
  defaultMailSenderName: "My Store"

channels:
  - name: "United States"
    slug: us
    currencyCode: USD
    defaultCountry: US

productTypes:
  - name: Book
    isShippingRequired: true
    productAttributes:
      - name: Author
        inputType: PLAIN_TEXT

categories:
  - name: Fiction
    slug: fiction

products:
  - name: "Sample Book"
    slug: sample-book
    productType: Book
    category: fiction
    variants:
      - name: Hardcover
        sku: BOOK-001
```

- [SCHEMA.md](SCHEMA.md) documents every field. `npx @saleor/configurator schema` prints the JSON Schema for editor autocompletion.
- [docs/ENTITY_REFERENCE.md](docs/ENTITY_REFERENCE.md) explains how entries are matched to the store and how they refer to each other.
- [example.yml](example.yml) is a complete store with every section.

Sections you leave out of the file are not touched. `deploy` creates and updates entities but does not delete them; `diff` lists entities that exist only in the store.

## Recipes

Recipes are starter configurations bundled with the CLI: `multi-region`, `digital-products`, `click-and-collect` and `custom-shipping`.

```bash
npx @saleor/configurator recipe list
npx @saleor/configurator recipe show multi-region
npx @saleor/configurator recipe export multi-region --output my-store.yml
npx @saleor/configurator recipe apply multi-region
```

See [recipes/README.md](recipes/README.md).

## CI/CD

In non-interactive environments the CLI skips prompts and prints JSON. Useful flags: `diff --github-comment --text` for pull request comments, `--fail-on-delete` to stop when deletions are found, and `introspect --drift-check` to detect changes made in the Dashboard. A GitHub Action is in [action/](action/README.md); workflow examples are in [docs/ci-cd/README.md](docs/ci-cd/README.md).

Requests are paced to stay under the Saleor Cloud sandbox limit. Caps, pacing and batch sizes are in [docs/LIMITS.md](docs/LIMITS.md). For errors, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Library

Import `createConfigurator` from `@saleor/configurator` to validate, introspect, diff and deploy in-process. See [docs/library.md](docs/library.md).

## AI agents

- **Skills** in [`skills/`](skills/) teach any coding agent the CLI, the config schema and Saleor's domain model: `npx skills add saleor/configurator`.
- **Claude Code plugin** in [`plugin/`](plugin/README.md) adds slash commands, agents and hooks: `claude --plugin-dir ./plugin`.

## Contributing

```bash
git clone https://github.com/saleor/configurator.git
cd configurator
pnpm install
pnpm dev introspect
```

[`.claude/CLAUDE.md`](.claude/CLAUDE.md) lists the checks CI runs and the end-to-end round trip against a sandbox. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) maps the code.

Every pull request needs a changeset (`pnpm changeset`) or the `skip changeset` label. Fixes for the current Saleor target are patch changesets. Moving to the next Saleor minor updates `package.json#saleor.schemaVersion` and is a minor changeset. Releases are published from `main` by the release workflow; see [PUBLISHING.md](PUBLISHING.md).

## License

MIT, see [LICENSE](LICENSE).
