import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getSupportedSaleorMinor } from "../package-info";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../../");

const version = getSupportedSaleorMinor();
const url = `https://raw.githubusercontent.com/saleor/saleor/${version}/saleor/graphql/schema.graphql`;

const response = await fetch(url);
if (!response.ok) {
  throw new Error(
    `Failed to fetch Saleor ${version} GraphQL schema: ${response.status} ${response.statusText}`
  );
}

const schema = (await response.text()).replace(/[ \t]+$/gm, "").replace(/\n*$/, "\n");

// Create the schema file in the project root's graphql directory
writeFileSync(join(projectRoot, "src/lib/graphql/schema.graphql"), schema);
