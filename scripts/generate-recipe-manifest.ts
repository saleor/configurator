#!/usr/bin/env tsx
/**
 * Generates the recipe manifest (manifest.json) from recipe YAML files.
 * Run this during build to create the recipe index.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseRecipeYaml } from "../src/modules/recipe/recipe-loader";
import {
  type RecipeManifest,
  type RecipeManifestEntry,
  recipeMetadataSchema,
} from "../src/modules/recipe/schema";

const RECIPES_DIR = path.join(process.cwd(), "src/recipes");
const MANIFEST_PATH = path.join(RECIPES_DIR, "manifest.json");

function generateManifest(): void {
  console.log("Generating recipe manifest...");

  const files = readdirSync(RECIPES_DIR).filter(
    (file) => file.endsWith(".yml") || file.endsWith(".yaml")
  );

  if (files.length === 0) {
    console.log("No recipe files found. Creating empty manifest.");
    const emptyManifest: RecipeManifest = {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      recipes: [],
    };
    writeFileSync(MANIFEST_PATH, JSON.stringify(emptyManifest, null, 2));
    return;
  }

  const recipes: RecipeManifestEntry[] = [];

  for (const file of files) {
    const filePath = path.join(RECIPES_DIR, file);
    console.log(`  Processing: ${file}`);

    try {
      const content = readFileSync(filePath, "utf-8");
      const parsed = parseRecipeYaml(content, filePath);

      const metadataResult = recipeMetadataSchema.safeParse(parsed.metadata);
      if (!metadataResult.success) {
        console.error(`  ❌ Invalid metadata in ${file}:`);
        for (const issue of metadataResult.error.issues) {
          console.error(`     - ${issue.path.join(".")}: ${issue.message}`);
        }
        process.exit(1);
      }

      const metadata = metadataResult.data;

      // Verify name matches filename
      const expectedName = path.basename(file, path.extname(file));
      if (metadata.name !== expectedName) {
        console.error(`  ❌ Metadata name "${metadata.name}" does not match filename "${file}"`);
        process.exit(1);
      }

      recipes.push({
        name: metadata.name,
        description: metadata.description,
        category: metadata.category,
        file,
        version: metadata.version,
        saleorVersion: metadata.saleorVersion,
        entitySummary: metadata.entitySummary,
      });

      console.log(`  ✓ ${metadata.name} (${metadata.category})`);
    } catch (error) {
      console.error(`  ❌ Failed to process ${file}:`);
      console.error(`     ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  const manifest: RecipeManifest = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    recipes,
  };

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\n✓ Generated manifest with ${recipes.length} recipes`);
  console.log(`  Output: ${MANIFEST_PATH}`);
}

generateManifest();
