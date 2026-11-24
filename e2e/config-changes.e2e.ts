import path from "node:path";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { type DeployResult, type Envelope, type PlanResult, saleorCli } from "./lib/cli";
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
type CategoryRead = {
  name: string;
  parent: { slug: string } | null;
  metadata: { key: string; value: string }[];
} | null;

const readCategory = async (slug: string) =>
  (
    await readSaleor<{ category: CategoryRead }>(
      "query($slug: String!) { category(slug: $slug) { name parent { slug } metadata { key value } } }",
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

    it("applies the new name in Saleor", async () => {
      expect((await readCategory(category.slug))?.name).toBe(renamed);
    });
  });

  describe("a key the schema doesn't support", () => {
    let deploy: Envelope<DeployResult>;

    beforeAll(() => {
      deploy = deployCategoryEdit(dir, seedPath, "unknown-key", (c) => {
        (c as Category & { erpCode?: string }).erpCode = "E2E-1";
      });
    });

    it("is never dropped silently", () => {
      const warned = deploy.logs.some(
        (log) => log.level === "warn" && log.message.includes("erpCode")
      );
      expect(warned || deploy.exitCode !== 0).toBe(true);
    });
  });
});

describe("changing a category tree", () => {
  const TREE_PREFIX = runPrefix("tree");
  const slugs = {
    root: `${TREE_PREFIX}-tyres`,
    mid: `${TREE_PREFIX}-summer`,
    leaf: `${TREE_PREFIX}-summer-car`,
    other: `${TREE_PREFIX}-rims`,
  };
  const tree = (): Category[] => [
    {
      name: `${TREE_PREFIX} Tyres`,
      slug: slugs.root,
      subcategories: [
        {
          name: `${TREE_PREFIX} Summer`,
          slug: slugs.mid,
          subcategories: [{ name: `${TREE_PREFIX} Summer car`, slug: slugs.leaf }],
        },
      ],
    },
    { name: `${TREE_PREFIX} Rims`, slug: slugs.other },
  ];
  const find = (categories: Category[], slug: string): Category | undefined => {
    for (const category of categories) {
      if (category.slug === slug) return category;
      const nested = find(category.subcategories ?? [], slug);
      if (nested) return nested;
    }
    return undefined;
  };

  let dir: string;
  let basePath: string;

  /** Writes the store's own config plus the edited tree, then previews and deploys it. */
  function previewAndDeploy(name: string, edit: (categories: Category[]) => void) {
    const categories = tree();
    edit(categories);
    const config = readConfig(basePath);
    config.categories = [...((config.categories as Category[]) ?? []), ...categories];
    const configPath = path.join(dir, `${name}.yml`);
    writeConfig(configPath, config);
    const cli = saleorCli(inject("saleor"), dir);
    const plan = cli.plan(configPath);
    const deploy = cli.deploy(configPath);
    return { plan, deploy, redeploy: () => cli.deploy(configPath) };
  }

  const operationFor = (plan: Envelope<PlanResult>, slug: string) =>
    plan.result.operations.find((op) => op.entity === "Categories" && op.name === slug);

  beforeAll(() => {
    dir = workspace("tree");
    basePath = path.join(dir, "base.yml");
    const cli = saleorCli(inject("saleor"), dir);
    const introspect = cli.introspect(basePath);
    if (introspect.exitCode !== 0) {
      throw new Error(`Introspecting the store failed: ${JSON.stringify(introspect)}`);
    }
    const { deploy } = previewAndDeploy("seed-tree", () => {});
    if (deploy.exitCode !== 0) {
      throw new Error(`Seeding the category tree failed: ${JSON.stringify(deploy)}`);
    }
  });

  describe("metadata on every level", () => {
    let run: ReturnType<typeof previewAndDeploy>;

    beforeAll(() => {
      run = previewAndDeploy("metadata", (categories) => {
        for (const slug of [slugs.root, slugs.mid, slugs.leaf]) {
          const category = find(categories, slug);
          if (category) category.metadata = { erpid: slug };
        }
      });
    });

    // Known bug: the preview lists every subcategory's metadata under the top-level category.
    it.fails("previews each category's metadata on that category", () => {
      for (const slug of [slugs.root, slugs.mid, slugs.leaf]) {
        expect(operationFor(run.plan, slug)?.fields).toEqual(["metadata.erpid"]);
      }
    });

    it("writes the metadata to each category", async () => {
      for (const slug of [slugs.root, slugs.mid, slugs.leaf]) {
        expect((await readCategory(slug))?.metadata).toContainEqual({ key: "erpid", value: slug });
      }
    });

    it("reports no changes on the next deploy", () => {
      expect(run.redeploy().result.status).toBe("no-changes");
    });
  });

  describe("renaming a subcategory", () => {
    const renamed = `${TREE_PREFIX} Summer passenger car`;
    let run: ReturnType<typeof previewAndDeploy>;

    beforeAll(() => {
      run = previewAndDeploy("rename-leaf", (categories) => {
        const leaf = find(categories, slugs.leaf);
        if (leaf) leaf.name = renamed;
      });
    });

    // Known bug: the diff never compares subcategory names, so deploy reports no changes.
    it.fails("previews the rename on the subcategory", () => {
      expect(operationFor(run.plan, slugs.leaf)?.fields).toEqual(["name"]);
    });

    it.fails("applies the new name in Saleor", async () => {
      expect((await readCategory(slugs.leaf))?.name).toBe(renamed);
    });
  });

  describe("moving a subcategory to another parent", () => {
    let run: ReturnType<typeof previewAndDeploy>;

    beforeAll(() => {
      run = previewAndDeploy("move-leaf", (categories) => {
        const mid = find(categories, slugs.mid);
        const other = find(categories, slugs.other);
        if (!mid || !other) throw new Error("The tree is missing a category");
        other.subcategories = mid.subcategories;
        mid.subcategories = [];
      });
    });

    // Known bug: the move shows up as changes to the two parents, not to the moved category.
    it.fails("previews the move on the moved category", () => {
      expect(operationFor(run.plan, slugs.leaf)?.fields).toContain("parent");
    });

    it("leaves the category under its parent, because Saleor can't move categories", async () => {
      expect((await readCategory(slugs.leaf))?.parent?.slug).toBe(slugs.mid);
    });
  });

  describe("a subcategory missing from the config", () => {
    let run: ReturnType<typeof previewAndDeploy>;

    beforeAll(() => {
      run = previewAndDeploy("drop-leaf", (categories) => {
        const mid = find(categories, slugs.mid);
        if (mid) mid.subcategories = [];
      });
    });

    // Known bug: it shows up as a change to its parent instead of as its own entry.
    it.fails("previews it as only in Saleor", () => {
      expect(operationFor(run.plan, slugs.leaf)?.action).toBe("delete");
    });

    it("leaves it in Saleor", async () => {
      expect(await readCategory(slugs.leaf)).not.toBeNull();
    });
  });
});
