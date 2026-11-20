import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    "src/cli/main.ts",
    "src/index.ts",
    "src/engine.ts",
    "scripts/*.ts",
    "e2e/*.e2e.ts",
    "e2e/global-setup.ts",
  ],
  // Specification contracts are design artifacts, not executable source.
  project: ["src/**/*.ts", "scripts/**/*.ts", "e2e/**/*.ts"],
  // gql.tada generates this declaration file from the Saleor schema.
  ignore: ["src/lib/graphql/graphql-env.d.ts"],
};

export default config;
