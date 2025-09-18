import { configSchema, type SaleorConfig } from "../modules/config/schema/schema";
import { ZodValidationError } from "../lib/errors/zod";

const ARRAY_SECTION_KEYS = [
  "channels",
  "warehouses",
  "shippingZones",
  "taxClasses",
  "attributes",
  "productTypes",
  "pageTypes",
  "modelTypes",
  "categories",
  "collections",
  "products",
  "models",
  "menus",
] as const satisfies ReadonlyArray<keyof SaleorConfig>;

const SINGLETON_SECTION_KEYS = ["shop"] as const satisfies ReadonlyArray<keyof SaleorConfig>;

type ArraySectionKey = (typeof ARRAY_SECTION_KEYS)[number];
type SingletonSectionKey = (typeof SINGLETON_SECTION_KEYS)[number];

type ArraySectionItem<K extends ArraySectionKey> = NonNullable<SaleorConfig[K]> extends Array<infer Item>
  ? Item
  : never;

type SingletonSectionValue<K extends SingletonSectionKey> = NonNullable<SaleorConfig[K]>;

type StackProgramResult =
  | void
  | Partial<SaleorConfig>
  | SaleorConfig
  | Promise<void | Partial<SaleorConfig> | SaleorConfig>;

function clone<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

const arraySectionSet = new Set<string>(ARRAY_SECTION_KEYS as ReadonlyArray<string>);
const singletonSectionSet = new Set<string>(SINGLETON_SECTION_KEYS as ReadonlyArray<string>);

class DeterminismGuard {
  private readonly originalRandom = Math.random;
  private readonly originalNow = Date.now;
  private readonly originalDate = Date;

  enter(): void {
    Math.random = () => {
      throw new Error("Non-deterministic Math.random() usage detected inside a stack definition");
    };
    Date.now = () => {
      throw new Error("Non-deterministic Date.now() usage detected inside a stack definition");
    };

    const OriginalDate = this.originalDate;
    const DeterministicDate = new Proxy(OriginalDate, {
      apply(target, thisArg, argArray) {
        if (!argArray || argArray.length === 0) {
          throw new Error("Non-deterministic new Date() usage detected inside a stack definition");
        }

        return Reflect.apply(target, thisArg, argArray);
      },
      construct(target, argArray, newTarget) {
        if (!argArray || argArray.length === 0) {
          throw new Error("Non-deterministic new Date() usage detected inside a stack definition");
        }

        return Reflect.construct(target, argArray, newTarget);
      },
    });

    globalThis.Date = DeterministicDate as unknown as DateConstructor;
  }

  exit(): void {
    Math.random = this.originalRandom;
    Date.now = this.originalNow;
    globalThis.Date = this.originalDate;
  }
}

class StackContext {
  private readonly arrays = new Map<ArraySectionKey, Array<unknown>>();
  private readonly singletons = new Map<SingletonSectionKey, unknown>();
  private readonly extras = new Map<keyof SaleorConfig, unknown>();
  private readonly identifiers = new Map<ArraySectionKey, Set<string>>();

  constructor(public readonly name: string) {}

  addArrayItem<K extends ArraySectionKey>(
    key: K,
    value: ArraySectionItem<K>,
    identifier?: string
  ): ArraySectionItem<K> {
    const copy = clone(value);
    const list = (this.arrays.get(key) as Array<ArraySectionItem<K>> | undefined) ?? [];
    this.registerIdentifier(key, identifier ?? this.inferIdentifier(copy));
    list.push(copy);
    this.arrays.set(key, list);
    return copy;
  }

  setSingleton<K extends SingletonSectionKey>(key: K, value: SingletonSectionValue<K>): void {
    if (this.singletons.has(key)) {
      throw new Error(`Section "${key}" is already defined in stack "${this.name}"`);
    }

    this.singletons.set(key, clone(value));
  }

  merge(partial: Partial<SaleorConfig>): void {
    for (const [rawKey, rawValue] of Object.entries(partial) as Array<[
      keyof SaleorConfig,
      SaleorConfig[keyof SaleorConfig],
    ]>) {
      if (rawValue === undefined || rawValue === null) continue;
      if (arraySectionSet.has(rawKey as string)) {
        const items = Array.isArray(rawValue) ? rawValue : [rawValue];
        for (const item of items as Array<unknown>) {
          const identifier = this.inferIdentifier(item);
          this.addArrayItem(rawKey as ArraySectionKey, item as never, identifier);
        }
        continue;
      }

      if (singletonSectionSet.has(rawKey as string)) {
        this.setSingleton(rawKey as SingletonSectionKey, rawValue as never);
        continue;
      }

      this.extras.set(rawKey, clone(rawValue));
    }
  }

  private registerIdentifier(key: ArraySectionKey, identifier?: string): void {
    if (!identifier) return;
    const normalized = identifier.trim();
    if (normalized.length === 0) return;

    const bucket = this.identifiers.get(key) ?? new Set<string>();
    if (bucket.has(normalized)) {
      throw new Error(`Duplicate identifier "${normalized}" found in section ${key}`);
    }
    bucket.add(normalized);
    this.identifiers.set(key, bucket);
  }

  private inferIdentifier(value: unknown): string | undefined {
    if (!value || typeof value !== "object") return undefined;
    const record = value as Record<string, unknown>;
    const slug = record.slug;
    if (typeof slug === "string" && slug.trim().length > 0) {
      return slug;
    }

    const name = record.name;
    if (typeof name === "string" && name.trim().length > 0) {
      return name;
    }

    return undefined;
  }

  build(): SaleorConfig {
    const partial: Partial<SaleorConfig> = {};

    for (const [key, list] of this.arrays.entries()) {
      (partial as Record<string, unknown>)[key] = list.map((item) => clone(item));
    }

    for (const [key, value] of this.singletons.entries()) {
      (partial as Record<string, unknown>)[key] = clone(value);
    }

    for (const [key, value] of this.extras.entries()) {
      (partial as Record<string, unknown>)[key] = clone(value);
    }

    const { success, data, error } = configSchema.safeParse(partial);
    if (!success) {
      throw ZodValidationError.fromZodError(
        error,
        `Stack "${this.name}" returned an invalid configuration`
      );
    }

    return data;
  }
}

const contextStack: StackContext[] = [];

function withActiveContext<T>(context: StackContext, fn: () => T | Promise<T>): Promise<T> | T {
  contextStack.push(context);
  const guard = new DeterminismGuard();
  guard.enter();
  try {
    return fn();
  } finally {
    guard.exit();
    contextStack.pop();
  }
}

function getActiveContext(): StackContext {
  const context = contextStack.at(-1);
  if (!context) {
    throw new Error(
      "Saleor Configurator resources must be instantiated inside a stack() definition"
    );
  }

  return context;
}

function ensureNameProperty<T extends Record<string, unknown>>(value: T, fallback: string): T {
  if (
    Object.prototype.hasOwnProperty.call(value, "name") &&
    (value as Record<string, unknown>).name === undefined
  ) {
    (value as Record<string, unknown>).name = fallback;
  }

  return value;
}

export interface StackDefinition {
  readonly name: string;
  build(): Promise<SaleorConfig>;
}

export interface StackApi {
  add<K extends ArraySectionKey>(
    key: K,
    value: ArraySectionItem<K>,
    identifier?: string
  ): ArraySectionItem<K>;
  set<K extends SingletonSectionKey>(key: K, value: SingletonSectionValue<K>): void;
  merge(partial: Partial<SaleorConfig>): void;
}

export function stack(name: string, program: (api: StackApi) => StackProgramResult): StackDefinition {
  return {
    name,
    async build(): Promise<SaleorConfig> {
      const context = new StackContext(name);
      const api: StackApi = {
        add: (key, value, identifier) => context.addArrayItem(key, value, identifier),
        set: (key, value) => context.setSingleton(key, value),
        merge: (partial) => context.merge(partial),
      };

      const result = await withActiveContext(context, () => program(api));
      if (result) {
        context.merge(result as Partial<SaleorConfig>);
      }

      return context.build();
    },
  };
}

export const defineStack = stack;

export function defineStaticConfig(config: SaleorConfig): StackDefinition {
  return {
    name: "static",
    async build(): Promise<SaleorConfig> {
      const { success, data, error } = configSchema.safeParse(config);
      if (!success) {
        throw ZodValidationError.fromZodError(
          error,
          "Static configuration doesn't match the expected schema"
        );
      }

      return data;
    },
  };
}

abstract class ArrayResource<K extends ArraySectionKey> {
  readonly name: string;
  readonly value: ArraySectionItem<K>;

  protected constructor(section: K, name: string, props: ArraySectionItem<K>) {
    const context = getActiveContext();
    const copy = ensureNameProperty(clone(props) as Record<string, unknown>, name);
    this.name = name;
    this.value = context.addArrayItem(section, copy as ArraySectionItem<K>);
  }
}

abstract class SingletonResource<K extends SingletonSectionKey> {
  readonly value: SingletonSectionValue<K>;

  protected constructor(section: K, props: SingletonSectionValue<K>) {
    const context = getActiveContext();
    const copy = clone(props);
    context.setSingleton(section, copy);
    this.value = copy;
  }
}

type ChannelInput = ArraySectionItem<"channels">;
type WarehouseInput = ArraySectionItem<"warehouses">;
type ShippingZoneInput = ArraySectionItem<"shippingZones">;
type TaxClassInput = ArraySectionItem<"taxClasses">;
type AttributeInput = ArraySectionItem<"attributes">;
type ProductTypeInput = ArraySectionItem<"productTypes">;
type PageTypeInput = ArraySectionItem<"pageTypes">;
type ModelTypeInput = ArraySectionItem<"modelTypes">;
type CategoryInput = ArraySectionItem<"categories">;
type CollectionInput = ArraySectionItem<"collections">;
type ProductInput = ArraySectionItem<"products">;
type ModelInput = ArraySectionItem<"models">;
type MenuInput = ArraySectionItem<"menus">;
type ShopInput = SingletonSectionValue<"shop">;

export class Channel extends ArrayResource<"channels"> {
  constructor(name: string, props: ChannelInput) {
    super("channels", name, props);
  }
}

export class Warehouse extends ArrayResource<"warehouses"> {
  constructor(name: string, props: WarehouseInput) {
    super("warehouses", name, props);
  }
}

export class ShippingZone extends ArrayResource<"shippingZones"> {
  constructor(name: string, props: ShippingZoneInput) {
    super("shippingZones", name, props);
  }
}

export class TaxClass extends ArrayResource<"taxClasses"> {
  constructor(name: string, props: TaxClassInput) {
    super("taxClasses", name, props);
  }
}

export class Attribute extends ArrayResource<"attributes"> {
  constructor(name: string, props: AttributeInput) {
    super("attributes", name, props);
  }
}

export class ProductType extends ArrayResource<"productTypes"> {
  constructor(name: string, props: ProductTypeInput) {
    super("productTypes", name, props);
  }
}

export class PageType extends ArrayResource<"pageTypes"> {
  constructor(name: string, props: PageTypeInput) {
    super("pageTypes", name, props);
  }
}

export class ModelType extends ArrayResource<"modelTypes"> {
  constructor(name: string, props: ModelTypeInput) {
    super("modelTypes", name, props);
  }
}

export class Category extends ArrayResource<"categories"> {
  constructor(name: string, props: CategoryInput) {
    super("categories", name, props);
  }
}

export class Collection extends ArrayResource<"collections"> {
  constructor(name: string, props: CollectionInput) {
    super("collections", name, props);
  }
}

export class Product extends ArrayResource<"products"> {
  constructor(name: string, props: ProductInput) {
    super("products", name, props);
  }
}

export class Model extends ArrayResource<"models"> {
  constructor(name: string, props: ModelInput) {
    super("models", name, props);
  }
}

export class Menu extends ArrayResource<"menus"> {
  constructor(name: string, props: MenuInput) {
    super("menus", name, props);
  }
}

export class Shop extends SingletonResource<"shop"> {
  constructor(props: ShopInput) {
    super("shop", props);
  }
}

export function configureShop(settings: ShopInput): ShopInput {
  const context = getActiveContext();
  const copy = clone(settings);
  context.setSingleton("shop", copy);
  return copy;
}

export type {
  ArraySectionItem,
  ArraySectionKey,
  SingletonSectionKey,
  SingletonSectionValue,
};
