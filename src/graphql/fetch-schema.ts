import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../../package.json"), "utf-8")
);

const version = packageJson.saleor.schemaVersion;
const url = `https://raw.githubusercontent.com/saleor/saleor/${version}/saleor/graphql/schema.graphql`;

const response = await fetch(url);
const schema = await response.text();
writeFileSync("graphql/schema.graphql", schema);
