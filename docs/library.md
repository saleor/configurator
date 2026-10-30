# Configurator library

Node.js 20+ ESM hosts can import Configurator without starting the Configurator CLI:

```ts
import { createConfigurator } from "@saleor/configurator";

const configurator = createConfigurator({ url: process.env.SALEOR_URL!, token: process.env.SALEOR_TOKEN! });
const config = {
  shop: { defaultMailSenderName: "My store" },
}; // This could come from a database, an HTTP request, or parsed JSON.
await configurator.validate(config);
const remote = await configurator.introspect();
const yaml = configurator.serialize(remote); // The host decides where to write it.
const summary = await configurator.diff(config);
// Show the plan and obtain approval in the host before deploying.
const { result, exitCode } = await configurator.deploy(config, summary);
```

## API

- `SUPPORTED_SALEOR: "3.23"`: supported Saleor minor version.
- `validate(input: ConfigurationInput): Promise<SaleorConfig>`: validate a configuration object or read and validate a YAML file, including preflight checks; no network.
- `serialize(config: SaleorConfig): string`: YAML serialization with the same serializer as introspection.
- `createConfigurator({ url, token }: ConfiguratorOptions): Configurator`: construct a store client.
- `configurator.validate(input)` and `configurator.serialize(config)` expose the same local helpers on the instance. They do not contact the store.
- `configurator.introspect(): Promise<SaleorConfig>`: introspect without saving a file.
- `configurator.diff(input: ConfigurationInput): Promise<DiffSummary>`: validate and compare with the store.
- `configurator.deploy(input: ConfigurationInput, summary: DiffSummary): Promise<{ result: DeploymentResult; exitCode: number }>`: validate and run the deployment pipeline with the supplied plan.
- `classifyError(error: unknown): ConfiguratorFailure`: map exceptions to a stable host-facing shape.
- `ConfiguratorError extends Error`: rejected operations carry `code`, `message`, `suggestions`, `issues`, and the original `cause`.

`ConfiguratorFailure.code` is `CONFIG_INVALID | STORE_AUTH_INVALID | NETWORK_ERROR | DEPLOY_PARTIAL | ENGINE_ERROR`. `issues` contains `{ path, message }` records where available. `classifyError` also accepts errors from the underlying services for compatibility with earlier hosts.

Deployment stage failures are returned as data, including partial failures; inspect **both** `exitCode` and `result.overallStatus`, then the individual stages. A deployment can modify the store before failing. Do not blindly retry. `DEPLOY_PARTIAL` is the classification for a thrown partial-deployment error; a returned partial result does not throw.

`SaleorConfig` is a readonly JSON-shaped document governed by the published `schema.json`; call `validate` to check a file. `DiffSummary` contains counts and readonly entity results. A change's `currentValue` and `desiredValue` are `Json | undefined`. Exported types also include `ConfigurationInput`, `Configurator`, `ConfiguratorOptions`, `ConfiguratorFailure`, `ConfiguratorErrorCode`, `Json`, `DiffOperation`, `DiffChange`, `DiffResult`, `StageResult`, and `DeploymentResult`. Declarations are generated from TypeScript by `pnpm build:library`; `pnpm build` produces both entry points.

## Configuration inputs

`ConfigurationInput` is `SaleorConfig | string`. Pass a plain JSON-shaped object directly to `validate`, `diff`, and `deploy`. The object is schema-validated and preflight-checked just like a YAML file, then copied so internal services cannot mutate your data. Frozen objects are supported. These calls do not read or write a configuration file when given an object.

For JSON text use `JSON.parse(text)`, then pass the resulting object. For YAML text parse it with your YAML library, then pass the result. Strings passed directly to Configurator always mean file paths, preserving existing integrations:

```ts
await configurator.validate(config);             // Object from your app
await configurator.diff(JSON.parse(jsonText));   // Parsed JSON
await configurator.diff("config.yml");          // Existing file workflow
```

Both source types use the same schema validation. `introspect()` already returns an object suitable for passing back into `validate`, `diff`, or `deploy`.

## Host responsibilities and limits

Importing the entry does not load dotenv, read argv, print, prompt, or exit. Operations suppress Configurator logging within their asynchronous scope without changing the CLI logger level or adding entries to its global collector. Progress is silent. Hosts load credentials, render results, persist YAML, and decide whether to apply a plan. The standalone CLI retains dotenv loading and its progress/output behavior.

Keep the configuration unchanged between reviewing its diff and deploying it. Each call validates and copies its input; objects stay in memory throughout diff and deployment. A string always means a YAML file path, and the file is read once per call. The plan is a selection of changes, not an immutable snapshot of entity payloads; deployment uses the configuration passed to that call and the current store. The API does not provide transactions, rollback, cancellation, or safe concurrent deployments. Deployments should be serialized because legacy resilience metrics still use shared state.

## Stability

`@saleor/configurator` is the supported library entry. Its documented functions, error codes, and data contracts follow semantic versioning: breaking library changes require a major package version. Configuration fields track the supported Saleor schema and are described by `schema.json`. Internal source paths, service classes, diagnostic wording, timing, and undocumented result fields are not public contracts. Future Effect-based internals will preserve this Promise-based boundary or introduce a separately versioned API.

## Next extraction seams

Start with pure preflight validators and diff comparison/selection functions. Next isolate YAML storage and GraphQL transport behind injected interfaces, then move per-entity operations and deployment orchestration onto those services. Progress is already injectable; scoped logging can become a host-provided service. Remove the remaining global resilience tracker before offering concurrent deployments. Keep Effect at these internal seams while retaining the public Promise facade for non-Effect hosts.

## Prototype compatibility

`@saleor/configurator/engine` retains `createEngine`, `Engine`, `EngineOptions`, `EngineError`, `EngineErrorCode`, and `EngineOperationError` for the existing CLI prototype. Its `pull()` maps to `introspect()`. New integrations should import `createConfigurator` and types from the package root. The CLI binary and command names are unchanged.
