# Repository Guidelines

## Project Structure & Module Organization

- `src/cli` – CLI bootstrap and command wiring.
- `src/commands` – Commands (`deploy`, `diff`, `introspect`, `start`).
- `src/core` – Diff, deployment, errors; `src/modules` – domain services.
- `src/lib` – Utilities, GraphQL, errors, logger, test setup.
- Tests live alongside code and in `__tests__`; build output at `dist/`.

## Architecture Overview

- Flow: YAML → Zod validate → desired state; Introspect builds remote via GraphQL (`urql` + `gql.tada`); Core Diff computes ops; Deployment applies via staged pipeline with metrics.
- Entity pattern: service `src/modules/<entity>/<entity>-service.ts` (CRUD + slug/id), comparator `src/core/diff/comparators/<entity>-comparator.ts`, tests `*.test.ts` and `*.integration.test.ts`.
- GraphQL: co-locate typed docs (`gql`) in services; use shared client from `src/lib/graphql`.
- Schema: define with Zod in config schema; regenerate docs with `pnpm generate-schema-docs` and JSON with `pnpm generate-json-schema`.

## Build, Test, and Development Commands

- Setup: `pnpm install` (Node 20+, pnpm 9+).
- Dev/Build/Test: `pnpm dev <cmd>`, `pnpm build`, `pnpm test` (`--watch`).
- Lint/Format: `pnpm lint`, `pnpm format:fix`; CI lint: `pnpm check:ci`.
- Docs/Versioning: `pnpm generate-json-schema`, `pnpm generate-schema-docs`, `pnpm changeset`.
- E2E: `pnpm test:e2e` (cloud smoke; see `.github/workflows/e2e.yml`).

## Coding Style & Naming Conventions

- TypeScript + ESM; kebab-case filenames/dirs (`product-service.ts`).
- Biome: 2 spaces, 100 cols, double quotes, semicolons, trailing commas.
- Prefer explicit types; cohesive modules and typed inputs/outputs.

## Testing Guidelines

- Vitest; tests alongside code or under `__tests__`.
- Names: `*.test.ts`; integration: `*.integration.test.ts`; `LOG_LEVEL=error` (auto).
- Run `pnpm test`; CI uses `pnpm test:ci`; mock network/IO where practical.

## Commit & Pull Request Guidelines

- Conventional Commits; create a Changeset for release-impacting work.
- PRs must pass lint/tests and include a clear description; link issues and add docs/examples.
- Never commit `dist/` or secrets; follow `.env.example` and `.gitignore`.

## Security & Configuration Tips

- Never commit tokens; use CLI flags or `.env` (see `LOG_LEVEL`).
- Always run `diff` before `deploy` to avoid destructive updates.

## Adding a New Entity

- Schema: add Zod shape to `src/modules/config/schema/schema.ts`; update `ConfigurationSection`/`EntityType` in `src/core/diff/types.ts`.
- Service: create `src/modules/<entity>/<entity>-service.ts` (CRUD, slug⇄id); co-locate typed GraphQL (`gql.tada` + `src/lib/graphql`).
- Comparator & Wiring: add `src/core/diff/comparators/<entity>-comparator.ts` (extend `BaseComparator` with `slug`/`name` identity) and register in `createComparators()`; include in `DiffService` arrays and relevant `index.ts` exports.
- Tests (see `docs/TESTING_PROTOCOLS.md`): unit for service, comparator tests, and `*.integration.test.ts`; targets ≥90% service, ≥80% workflows; run `pnpm test` and `pnpm test --include='**/*.integration.test.ts'`.
- Docs & Validation: `pnpm generate-json-schema && pnpm generate-schema-docs`; verify with `pnpm dev diff --include=<section>`; use E2E protocol for idempotency and rollback.

## Templates: Service, Comparator, Tests

Service (`src/modules/foo/foo-service.ts`)
```ts
import { ServiceErrorWrapper } from "../../lib/utils/error-wrapper";
import type { FooInput } from "../config/schema/schema";
import type { FooOperations, Foo } from "./repository";
import { FooError, FooCreationError } from "./errors";

export class FooService {
  constructor(private repo: FooOperations) {}

  async getAll() {
    return ServiceErrorWrapper.wrapServiceCall("fetch all foos", "foos", undefined, () =>
      this.repo.getAll()
    , FooError);
  }

  async upsert(input: FooInput): Promise<Foo> {
    return ServiceErrorWrapper.wrapServiceCall("upsert foo", "foo", input.slug ?? input.name, async () => {
      const existing = await this.repo.getBySlug(input.slug ?? input.name);
      return existing
        ? this.repo.update(existing.id, mapToUpdate(input))
        : this.repo.create(mapToCreate(input));
    }, FooCreationError);
  }

  async bootstrap(items: FooInput[]): Promise<Foo[]> {
    const { successes, failures } = await ServiceErrorWrapper.wrapBatch(
      items,
      "Bootstrap foos",
      (i) => i.slug ?? i.name,
      (i) => this.upsert(i)
    );
    if (failures.length) throw new FooError(`Failed: ${failures.length}`, failures.map(f => `${f.item.slug ?? f.item.name}: ${f.error.message}`));
    return successes.map((s) => s.result);
  }
}

function mapToCreate(input: FooInput) { return { /* ... */ }; }
function mapToUpdate(input: FooInput) { return { /* ... */ }; }
```

Comparator (`src/core/diff/comparators/foo-comparator.ts`)
```ts
import type { SaleorConfig } from "../../../modules/config/schema/schema";
import { BaseEntityComparator } from "./base-comparator";
type FooEntity = NonNullable<SaleorConfig["foos"]>[number];

export class FooComparator extends BaseEntityComparator<readonly FooEntity[], readonly FooEntity[], FooEntity> {
  protected readonly entityType = "Foos";

  compare(local: readonly FooEntity[], remote: readonly FooEntity[]) {
    this.validateUniqueIdentifiers(local); this.validateUniqueIdentifiers(remote);
    const results = [] as ReturnType<this["createCreateResult"]>[];
    const rMap = this.createEntityMap(remote); const lMap = this.createEntityMap(local);
    for (const l of local) { const r = rMap.get(this.getEntityName(l));
      if (!r) results.push(this.createCreateResult(l));
      else { const changes = this.compareEntityFields(l, r); if (changes.length) results.push(this.createUpdateResult(l, r, changes)); }
    }
    for (const r of remote) if (!lMap.has(this.getEntityName(r))) results.push(this.createDeleteResult(r));
    return results;
  }
  protected getEntityName(e: FooEntity) { return (e as any).slug ?? (e as any).name; }
  protected compareEntityFields(local: FooEntity, remote: FooEntity) {
    const changes = [] as any[];
    if ((local as any).name !== (remote as any).name) changes.push(this.createFieldChange("name", (remote as any).name, (local as any).name));
    return changes;
  }
}
```

Service test (`src/modules/foo/foo-service.test.ts`)
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FooService } from "./foo-service";

const repo = { getAll: vi.fn(), getBySlug: vi.fn(), create: vi.fn(), update: vi.fn() };
let service: FooService;
beforeEach(() => { vi.resetAllMocks(); service = new FooService(repo as any); });

it("creates when missing", async () => {
  repo.getBySlug.mockResolvedValue(null); repo.create.mockResolvedValue({ id: "1" });
  const res = await service.upsert({ name: "A", slug: "a" } as any);
  expect(repo.create).toHaveBeenCalled(); expect(res.id).toBe("1");
});

it("updates when exists", async () => {
  repo.getBySlug.mockResolvedValue({ id: "1" }); repo.update.mockResolvedValue({ id: "1" });
  await service.upsert({ name: "A", slug: "a" } as any);
  expect(repo.update).toHaveBeenCalledWith("1", expect.any(Object));
});
```

Comparator test (`src/core/diff/comparators/foo-comparator.test.ts`)
```ts
import { FooComparator } from "./foo-comparator";
it("detects create/update/delete", () => {
  const c = new FooComparator();
  const local = [{ name: "A", slug: "a" }, { name: "B", slug: "b" }];
  const remote = [{ name: "A1", slug: "a" }, { name: "C", slug: "c" }];
  const diff = c.compare(local as any, remote as any);
  expect(diff.map(d => d.operation)).toEqual(expect.arrayContaining(["CREATE","UPDATE","DELETE"]));
});
```

Wiring snippets
- Types: add `"Foos"` to `EntityType` and `"foos"` to `ConfigurationSection`.
- Comparator map: in `createComparators()` add `["foos", new FooComparator()]` and include `"foos"` in entity arrays.
- Exports: export from `src/core/diff/comparators/index.ts`.
- ServiceContainer: add repository/service to `ServiceComposer.compose()`.

Errors (`src/modules/foo/errors.ts`)
```ts
import { BaseError } from "../../lib/errors/shared";
export class FooError extends BaseError { constructor(message: string, details?: string[]) { super(message, "FOO_ERROR", details); } }
export class FooCreationError extends FooError { constructor(name?: string) { super(`Failed to create foo${name ? ` '${name}'` : ''}`, ["Check GraphQL errors", "Validate input schema"]); } }
```

Repository (minimal) (`src/modules/foo/repository.ts`)
```ts
import type { Client } from "@urql/core";
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";

const listFoos = graphql(`query ListFoos { foos(first: 100) { edges { node { id name slug } } } }`);
const getFoo = graphql(`query GetFoo($id: ID!) { foo(id: $id) { id name slug } }`);
const createFoo = graphql(`mutation CreateFoo($input: FooCreateInput!) { createFoo(input: $input) { foo { id name slug } errors { field message code } } }`);
const updateFoo = graphql(`mutation UpdateFoo($id: ID!, $input: FooUpdateInput!) { updateFoo(id: $id, input: $input) { foo { id name slug } errors { field message code } } }`);

export type Foo = ResultOf<typeof getFoo>["foo"];
export type FooCreateInput = VariablesOf<typeof createFoo>["input"];
export type FooUpdateInput = VariablesOf<typeof updateFoo>["input"];
export interface FooOperations { getAll(): Promise<Foo[]>; getBySlug(slug: string): Promise<Foo | null>; create(input: FooCreateInput): Promise<Foo>; update(id: string, input: FooUpdateInput): Promise<Foo>; }

export class FooRepository implements FooOperations {
  constructor(private client: Client) {}
  async getAll() { const res = await this.client.query(listFoos, {}); if (res.error) throw GraphQLError.fromCombinedError("Failed to fetch foos", res.error); return res.data?.foos?.edges.map(e => e.node) ?? []; }
  async getBySlug(slug: string) { const all = await this.getAll(); return all.find(x => x?.slug === slug) ?? null; }
  async create(input: FooCreateInput) { const res = await this.client.mutation(createFoo, { input }); if (res.error) throw GraphQLError.fromCombinedError(`Failed to create ${input.name}`, res.error); if (res.data?.createFoo?.errors?.length) throw GraphQLError.fromDataErrors("Failed to create foo", res.data.createFoo.errors); return res.data!.createFoo!.foo!; }
  async update(id: string, input: FooUpdateInput) { const res = await this.client.mutation(updateFoo, { id, input }); if (res.error) throw GraphQLError.fromCombinedError(`Failed to update ${input.name ?? id}`, res.error); if (res.data?.updateFoo?.errors?.length) throw GraphQLError.fromDataErrors("Failed to update foo", res.data.updateFoo.errors); return res.data!.updateFoo!.foo!; }
}
```
