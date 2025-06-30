import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../../");

const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf-8"));

const version = packageJson.saleor.schemaVersion;
const url = `https://raw.githubusercontent.com/saleor/saleor/${version}/saleor/graphql/schema.graphql`;

const response = await fetch(url);
const schema = await response.text();

// Create the schema file in the project root's graphql directory
writeFileSync(join(projectRoot, "src/lib/graphql/schema.graphql"), schema);
