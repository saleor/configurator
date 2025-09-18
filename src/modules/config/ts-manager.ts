import { access, mkdir, writeFile } from "node:fs/promises";
import { constants as fsConstants, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";
import { logger } from "../../lib/logger";
import { ZodValidationError } from "../../lib/errors/zod";
import { ConfigurationLoadError } from "../../core/errors/configuration-errors";
import type { SaleorConfig } from "./schema/schema";
import { configSchema } from "./schema/schema";
import { EntityNotFoundError } from "./errors";
import type { ConfigurationStorage } from "./yaml-manager";

const BUNDLE_DIRECTORY = path.join(".configurator", "dsl-build");
const BUNDLE_FILENAME = "config-bundle.mjs";
const TS_EXTENSIONS = new Set([".ts", ".mts", ".cts", ".tsx"]);
const JS_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);
const SECTION_CLASS_MAP = {
  channels: "Channel",
  warehouses: "Warehouse",
  shippingZones: "ShippingZone",
  taxClasses: "TaxClass",
  attributes: "Attribute",
  productTypes: "ProductType",
  pageTypes: "PageType",
  modelTypes: "ModelType",
  categories: "Category",
  collections: "Collection",
  products: "Product",
  models: "Model",
  menus: "Menu",
} as const;

type SectionKey = keyof typeof SECTION_CLASS_MAP;

const SINGLETON_CLASS_MAP = {
  shop: "Shop",
} as const;

type SingletonKey = keyof typeof SINGLETON_CLASS_MAP;

interface StackLike {
  build(): Promise<SaleorConfig> | SaleorConfig;
}

export type TypeScriptConfigurationLayout = "single" | "split-sections";

export interface TypeScriptConfigurationOptions {
  readonly layout?: TypeScriptConfigurationLayout;
  readonly baseDir?: string;
}

type ArraySectionKey = keyof typeof SECTION_CLASS_MAP;

interface SectionModuleDefinition {
  readonly key: ArraySectionKey | SingletonKey;
  readonly modulePath: string;
  readonly functionName: string;
  readonly className: string;
  readonly typeName: string;
  readonly isArray: boolean;
}

const SECTION_MODULES: Record<ArraySectionKey | SingletonKey, SectionModuleDefinition> = {
  shop: {
    key: "shop",
    modulePath: "shop.ts",
    functionName: "configureShop",
    className: SINGLETON_CLASS_MAP.shop,
    typeName: "ShopProps",
    isArray: false,
  },
  channels: {
    key: "channels",
    modulePath: "channels.ts",
    functionName: "registerChannels",
    className: SECTION_CLASS_MAP.channels,
    typeName: "ChannelProps",
    isArray: true,
  },
  warehouses: {
    key: "warehouses",
    modulePath: "warehouses.ts",
    functionName: "registerWarehouses",
    className: SECTION_CLASS_MAP.warehouses,
    typeName: "WarehouseProps",
    isArray: true,
  },
  shippingZones: {
    key: "shippingZones",
    modulePath: "shipping-zones.ts",
    functionName: "registerShippingZones",
    className: SECTION_CLASS_MAP.shippingZones,
    typeName: "ShippingZoneProps",
    isArray: true,
  },
  taxClasses: {
    key: "taxClasses",
    modulePath: "tax-classes.ts",
    functionName: "registerTaxClasses",
    className: SECTION_CLASS_MAP.taxClasses,
    typeName: "TaxClassProps",
    isArray: true,
  },
  attributes: {
    key: "attributes",
    modulePath: "attributes.ts",
    functionName: "registerAttributes",
    className: SECTION_CLASS_MAP.attributes,
    typeName: "AttributeProps",
    isArray: true,
  },
  productTypes: {
    key: "productTypes",
    modulePath: "product-types.ts",
    functionName: "registerProductTypes",
    className: SECTION_CLASS_MAP.productTypes,
    typeName: "ProductTypeProps",
    isArray: true,
  },
  pageTypes: {
    key: "pageTypes",
    modulePath: "page-types.ts",
    functionName: "registerPageTypes",
    className: SECTION_CLASS_MAP.pageTypes,
    typeName: "PageTypeProps",
    isArray: true,
  },
  modelTypes: {
    key: "modelTypes",
    modulePath: "model-types.ts",
    functionName: "registerModelTypes",
    className: SECTION_CLASS_MAP.modelTypes,
    typeName: "ModelTypeProps",
    isArray: true,
  },
  categories: {
    key: "categories",
    modulePath: "categories.ts",
    functionName: "registerCategories",
    className: SECTION_CLASS_MAP.categories,
    typeName: "CategoryProps",
    isArray: true,
  },
  collections: {
    key: "collections",
    modulePath: "collections.ts",
    functionName: "registerCollections",
    className: SECTION_CLASS_MAP.collections,
    typeName: "CollectionProps",
    isArray: true,
  },
  products: {
    key: "products",
    modulePath: "products.ts",
    functionName: "registerProducts",
    className: SECTION_CLASS_MAP.products,
    typeName: "ProductProps",
    isArray: true,
  },
  models: {
    key: "models",
    modulePath: "models.ts",
    functionName: "registerModels",
    className: SECTION_CLASS_MAP.models,
    typeName: "ModelProps",
    isArray: true,
  },
  menus: {
    key: "menus",
    modulePath: "menus.ts",
    functionName: "registerMenus",
    className: SECTION_CLASS_MAP.menus,
    typeName: "MenuProps",
    isArray: true,
  },
};

function toAbsolute(configPath: string): string {
  return path.isAbsolute(configPath) ? configPath : path.resolve(configPath);
}

async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath, fsConstants.F_OK);
  } catch {
    throw new EntityNotFoundError(`Configuration file not found: ${filePath}`);
  }
}

function resolveDslEntryPoint(): string {
  const candidates = [
    new URL("../../dsl/index.ts", import.meta.url),
    new URL("../../dsl/index.js", import.meta.url),
    new URL("../../dsl/index.mjs", import.meta.url),
  ];

  for (const candidate of candidates) {
    const filePath = fileURLToPath(candidate);
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  throw new ConfigurationLoadError("Unable to resolve Saleor Configurator DSL runtime");
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join(path.posix.sep);
}

async function bundleProgram(entryPoint: string, outfile: string): Promise<void> {
  const projectRoot = process.cwd();
  const dslEntry = resolveDslEntryPoint();
  const relativeDslPath = toPosixPath(path.relative(projectRoot, dslEntry));

  try {
    await build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node20",
      outfile,
      sourcemap: "inline",
      absWorkingDir: projectRoot,
      logLevel: "silent",
      tsconfigRaw: {
        compilerOptions: {
          module: "esnext",
          moduleResolution: "nodenext",
          target: "es2022",
          baseUrl: ".",
          paths: {
            "@saleor/configurator/dsl": [relativeDslPath],
          },
          allowJs: true,
          resolveJsonModule: true,
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
        },
      },
    });
  } catch (error) {
    throw new ConfigurationLoadError(
      error instanceof Error
        ? `Failed to compile configuration program: ${error.message}`
        : "Failed to compile configuration program"
    );
  }
}

async function resolveStackResult(exported: unknown, configPath: string): Promise<SaleorConfig> {
  if (!exported) {
    throw new ConfigurationLoadError(
      `Configuration module ${configPath} must export a stack() definition or configuration object`
    );
  }

  if (exported instanceof Promise) {
    const resolved = await exported;
    return resolveStackResult(resolved, configPath);
  }

  if (typeof exported === "function") {
    const result = await exported();
    return resolveStackResult(result, configPath);
  }

  if (typeof exported === "object") {
    const maybeStack = exported as Partial<StackLike>;
    if (maybeStack && typeof maybeStack.build === "function") {
      const result = await maybeStack.build();
      return resolveStackResult(result, configPath);
    }

    const { success, data, error } = configSchema.safeParse(exported);
    if (!success) {
      throw ZodValidationError.fromZodError(
        error,
        `Configuration defined in ${configPath} doesn't match the expected schema`
      );
    }

    return data;
  }

  throw new ConfigurationLoadError(
    `Unsupported export type in configuration module ${configPath}`
  );
}

function isValidIdentifier(key: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/u.test(key);
}

function formatKey(key: string): string {
  return isValidIdentifier(key) ? key : JSON.stringify(key);
}

function formatValue(value: unknown, indentLevel: number): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const indent = " ".repeat(indentLevel + 2);
    const closingIndent = " ".repeat(indentLevel);
    const items = value
      .map((item) => `${indent}${formatValue(item, indentLevel + 2)}`)
      .join(",\n");
    return `[\n${items}\n${closingIndent}]`;
  }

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "number":
    case "boolean":
      return String(value);
    case "bigint":
      return `${value}n`;
    case "undefined":
      return "undefined";
    case "object": {
      const entries = Object.entries(value as Record<string, unknown>).filter(
        ([, val]) => val !== undefined
      );
      if (entries.length === 0) return "{}";
      const indent = " ".repeat(indentLevel + 2);
      const closingIndent = " ".repeat(indentLevel);
      const lines = entries
        .map(([key, val]) => `${indent}${formatKey(key)}: ${formatValue(val, indentLevel + 2)}`)
        .join(",\n");
      return `{\n${lines}\n${closingIndent}}`;
    }
    default:
      return JSON.stringify(value);
  }
}

function getResourceName(section: SectionKey, item: unknown, index: number): string {
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    const nameCandidate = record.name;
    if (typeof nameCandidate === "string" && nameCandidate.trim().length > 0) {
      return nameCandidate;
    }

    const slugCandidate = record.slug;
    if (typeof slugCandidate === "string" && slugCandidate.trim().length > 0) {
      return slugCandidate;
    }
  }

  return `${section}-${index + 1}`;
}

function createDslProgram(config: SaleorConfig, stackName: string): string {
  const imports = new Set<string>(["defineStack"]);
  const blocks: string[] = [];

  if (config.shop) {
    imports.add(SINGLETON_CLASS_MAP.shop);
    const props = formatValue(config.shop, 2);
    blocks.push(`  new ${SINGLETON_CLASS_MAP.shop}(${props});`);
  }

  (Object.keys(SECTION_CLASS_MAP) as SectionKey[]).forEach((sectionKey) => {
    const rawItems = config[sectionKey];
    if (!Array.isArray(rawItems) || rawItems.length === 0) return;
    imports.add(SECTION_CLASS_MAP[sectionKey]);

    const sectionLines = (rawItems as Array<unknown>)
      .filter((item): item is Record<string, unknown> => item !== null && item !== undefined)
      .map((item, index) => {
        const resourceName = getResourceName(sectionKey, item, index);
        const props = formatValue(item, 2);
        return `  new ${SECTION_CLASS_MAP[sectionKey]}(${JSON.stringify(resourceName)}, ${props});`;
      });

    if (sectionLines.length > 0) {
      blocks.push(sectionLines.join("\n"));
    }
  });

  const otherImports = Array.from(imports).filter((name) => name !== "defineStack").sort();
  const importList = ["defineStack", ...otherImports];
  const importStatement = `import { ${importList.join(", ")} } from "@saleor/configurator/dsl";`;

  const body = blocks.length > 0 ? `${blocks.join("\n\n")}\n` : "";
  const stackId = JSON.stringify(stackName);

  return `${importStatement}\n\nexport default defineStack(${stackId}, () => {\n${body}});\n`;
}

function formatImportPath(from: string, to: string): string {
  const relative = path.relative(path.dirname(from), to).replace(/\\/g, "/");
  const normalized = relative.startsWith(".") ? relative : `./${relative}`;
  return normalized.replace(/\.ts$/u, "");
}

function createModuleContent(def: SectionModuleDefinition, value: unknown): string {
  const importLine = `import { ${def.className} } from "@saleor/configurator/dsl";`;
  const typeImport = `import type { ${def.typeName} } from "@saleor/configurator/dsl/types";`;

  if (def.isArray) {
    const dataLiteral = formatValue(value, 0);
    return `${importLine}
${typeImport}

const data: ${def.typeName}[] = ${dataLiteral};

export function ${def.functionName}() {
  data.forEach((item) => {
    const identifier = item?.slug ?? item?.name ?? "${def.key}";
    new ${def.className}(identifier, item);
  });
}
`;
  }

  const dataLiteral = formatValue(value, 0);
  return `${importLine}
${typeImport}

const data: ${def.typeName} = ${dataLiteral};

export function ${def.functionName}() {
  new ${def.className}(data);
}
`;
}

function createSplitRootContent(
  targetPath: string,
  stackName: string,
  modules: Array<{ def: SectionModuleDefinition; modulePath: string }>
): string {
  const importLines = modules
    .map(({ def, modulePath }) => `import { ${def.functionName} } from "${formatImportPath(targetPath, modulePath)}";`)
    .join("\n");

  const calls = modules.map(({ def }) => `  ${def.functionName}();`).join("\n");
  const body = calls ? `\n${calls}\n` : "\n";

  return `import { defineStack } from "@saleor/configurator/dsl";
${importLines ? `\n${importLines}\n` : ""}
export default defineStack(${JSON.stringify(stackName)}, () => {${body}});
`;
}

export class TypeScriptConfigurationManager implements ConfigurationStorage {
  constructor(
    private readonly configPath: string,
    private readonly options: TypeScriptConfigurationOptions = {}
  ) {
    logger.debug("Initializing TypeScriptConfigurationManager", {
      configPath,
      layout: options.layout ?? "single",
      baseDir: options.baseDir,
    });
  }

  async save(config: SaleorConfig): Promise<void> {
    const targetPath = toAbsolute(this.configPath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    const parsed = path.parse(targetPath);
    const stackName = parsed.name || "saleor";

    if (this.options.layout === "split-sections") {
      await this.saveSplitSections(config, targetPath, stackName);
      logger.info(`Saved configuration to ${this.configPath}`);
      return;
    }

    const source = createDslProgram(config, stackName);
    await writeFile(targetPath, source, "utf-8");
    logger.info(`Saved configuration to ${this.configPath}`);
  }

  async load(): Promise<SaleorConfig> {
    const targetPath = toAbsolute(this.configPath);
    await ensureFileExists(targetPath);

    const bundleDir = path.resolve(path.dirname(targetPath), BUNDLE_DIRECTORY);
    await mkdir(bundleDir, { recursive: true });
    const bundlePath = path.join(bundleDir, BUNDLE_FILENAME);

    logger.debug("Compiling configuration program", { targetPath, bundlePath });
    await bundleProgram(targetPath, bundlePath);

    try {
      const moduleUrl = `${pathToFileURL(bundlePath).href}?v=${Date.now()}`;
      const moduleExports = await import(moduleUrl);
      const candidate =
        moduleExports.default ??
        moduleExports.stack ??
        moduleExports.config ??
        moduleExports.configuration;

      const config = await resolveStackResult(candidate, this.configPath);
      logger.info(`Loaded configuration from ${this.configPath}`);
      return config;
    } catch (error) {
      if (error instanceof ZodValidationError || error instanceof EntityNotFoundError) {
        throw error;
      }

      throw new ConfigurationLoadError(
        error instanceof Error
          ? `Failed to load configuration from ${this.configPath}: ${error.message}`
          : `Failed to load configuration from ${this.configPath}`
      );
    }
  }

  private async saveSplitSections(
    config: SaleorConfig,
    targetPath: string,
    stackName: string
  ): Promise<void> {
    const baseDir = this.options.baseDir ?? path.join(path.dirname(targetPath), "sections");
    await mkdir(baseDir, { recursive: true });

    const modulesWithData = Object.values(SECTION_MODULES)
      .map((def) => ({
        def,
        value: config[def.key as keyof SaleorConfig],
      }))
      .filter(({ value }) => {
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return Boolean(value);
      });

    await Promise.all(
      modulesWithData.map(async ({ def, value }) => {
        const modulePath = path.join(baseDir, def.modulePath);
        await mkdir(path.dirname(modulePath), { recursive: true });
        const content = createModuleContent(def, value);
        await writeFile(modulePath, content, "utf-8");
      })
    );

    const rootContent = createSplitRootContent(
      targetPath,
      stackName,
      modulesWithData.map(({ def }) => ({
        def,
        modulePath: path.join(baseDir, def.modulePath),
      }))
    );

    await writeFile(targetPath, rootContent, "utf-8");
  }
}

export function isTypeScriptConfigPath(configPath: string): boolean {
  const ext = path.extname(configPath).toLowerCase();
  if (TS_EXTENSIONS.has(ext)) return true;
  if (JS_EXTENSIONS.has(ext)) return true;
  return false;
}
