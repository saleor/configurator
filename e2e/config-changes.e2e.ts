import path from "node:path";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { type DeployResult, type Envelope, saleorCli } from "./lib/cli";
import {
  readConfig,
  readSaleor,
  runPrefix,
  seedSlice,
  seedStore,
  workspace,
  writeConfig,
} from "./lib/store";

const PREFIX = runPrefix("changes");

type Category = { name: string; slug: string; metadata?: unknown; subcategories?: Category[] };
type CategoryRead = { name: string; metadata: { key: string; value: string }[] } | null;

const readCategory = async (slug: string) =>
  (
    await readSaleor<{ category: CategoryRead }>(
      "query($slug: String!) { category(slug: $slug) { name metadata { key value } } }",
      { slug }
    )
  ).category;

/** Edits the slice's top-level category in a copy of the seeded config and deploys it. */
function deployCategoryEdit(
  dir: string,
  seedPath: string,
  name: string,
  edit: (category: Category) => void
) {
  const config = readConfig(seedPath);
  const category = (config.categories as Category[]).find(
    (c) => c.slug === seedSlice(PREFIX).categories[0].slug
  );
  if (!category) throw new Error("The seeded category is missing from the config");
  edit(category);
  const editedPath = path.join(dir, `${name}.yml`);
  writeConfig(editedPath, config);
  return saleorCli(inject("saleor"), dir).deploy(editedPath);
}

describe("changing a deployed config", () => {
  const [category] = seedSlice(PREFIX).categories;
  const [subcategory] = category.subcategories;
  let dir: string;
  let seedPath: string;

  beforeAll(() => {
    dir = workspace("changes");
    ({ seedPath } = seedStore(dir, PREFIX));
  });

  describe("renaming a category", () => {
    const renamed = `${category.name} Renamed`;
    let deploy: Envelope<DeployResult>;

    beforeAll(() => {
      deploy = deployCategoryEdit(dir, seedPath, "rename-category", (c) => {
        c.name = renamed;
      });
    });

    it("deploys the rename without errors", () => {
      expect(deploy.exitCode).toBe(0);
    });

    // Known bug: deploy reports the update, but Saleor keeps the old name.
    it.fails("applies the new name in Saleor", async () => {
      expect((await readCategory(category.slug))?.name).toBe(renamed);
    });
  });

  describe("renaming a subcategory", () => {
    const renamed = `${subcategory.name} Renamed`;

    beforeAll(() => {
      deployCategoryEdit(dir, seedPath, "rename-subcategory", (c) => {
        const sub = c.subcategories?.find((s) => s.slug === subcategory.slug);
        if (sub) sub.name = renamed;
      });
    });

    // Known bug: the rename isn't detected at all; deploy reports no changes.
    it.fails("applies the new name in Saleor", async () => {
      expect((await readCategory(subcategory.slug))?.name).toBe(renamed);
    });
  });

  describe("a key the schema doesn't support", () => {
    const metadata = [{ key: "e2e-flag", value: "on" }];
    let deploy: Envelope<DeployResult>;

    beforeAll(() => {
      deploy = deployCategoryEdit(dir, seedPath, "unknown-key", (c) => {
        c.metadata = metadata;
      });
    });

    const isWritten = async () => {
      const written = (await readCategory(category.slug))?.metadata ?? [];
      return metadata.every((entry) =>
        written.some((w) => w.key === entry.key && w.value === entry.value)
      );
    };

    it("is never dropped silently", async () => {
      const warned = deploy.logs.some(
        (log) => log.level === "warn" && log.message.includes(".metadata")
      );
      expect(warned || (await isWritten())).toBe(true);
    });

    // Known bug: category `metadata` passes validation, the deploy warns it "was ignored" and
    // succeeds, and the value never reaches Saleor. Either outcome fixes it: the value is
    // written, or the deploy refuses the file.
    it.fails("is either written to Saleor or rejected", async () => {
      expect(deploy.exitCode !== 0 || (await isWritten())).toBe(true);
    });
  });
});
