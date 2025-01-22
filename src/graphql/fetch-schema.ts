import { readFileSync } from "fs";
import { join } from "path";

const packageJson = JSON.parse(
  readFileSync(join(import.meta.dir, "../../package.json"), "utf-8")
);

const version = packageJson.saleor.schemaVersion;
const url = `https://raw.githubusercontent.com/saleor/saleor/${version}/saleor/graphql/schema.graphql`;

await Bun.write(
  "graphql/schema.graphql",
  await fetch(url).then((r) => r.text())
);
