import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["src/cli/main.ts", "scripts/*.ts"],
  // Specification contracts are design artifacts, not executable source.
  project: ["src/**/*.ts", "scripts/**/*.ts"],
  // gql.tada generates this declaration file from the Saleor schema.
  ignore: ["src/lib/graphql/graphql-env.d.ts"],
};

export default config;
