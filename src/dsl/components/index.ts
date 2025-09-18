import { Attribute, Channel, PageType, Product, ProductType, ShippingZone, Warehouse } from "..";
import type {
  AttributeProps,
  ChannelProps,
  PageTypeProps,
  ProductProps,
  ProductTypeProps,
  ShippingZoneProps,
  WarehouseProps,
} from "../types";

type ChannelSettings = Record<string, unknown>;

type MarketChannelInput = Omit<ChannelProps, "settings" | "isActive"> & {
  readonly settings?: Partial<ChannelSettings>;
  readonly isActive?: boolean;
};

type ChannelDefaults = Partial<ChannelSettings>;

type AttributeCollection = ReadonlyArray<AttributeProps>;

type ProductTypeCollection = ReadonlyArray<ProductTypeProps>;

type ProductCollection = ReadonlyArray<ProductProps>;

type WarehouseCollection = ReadonlyArray<WarehouseProps>;

type ShippingZoneCollection = ReadonlyArray<ShippingZoneProps>;

type PageTypeCollection = ReadonlyArray<PageTypeProps>;

type RegisterAttributesFn = (attributes: AttributeCollection) => void;

type RegisterProductTypesFn = (productTypes: ProductTypeCollection) => void;

type RegisterProductsFn = (products: ProductCollection) => void;

type RegisterWarehousesFn = (warehouses: WarehouseCollection) => void;

type RegisterShippingZonesFn = (shippingZones: ShippingZoneCollection) => void;

type RegisterPageTypesFn = (pageTypes: PageTypeCollection) => void;

export function createMarketChannel(
  input: MarketChannelInput,
  defaults: ChannelDefaults = {}
): Channel {
  const settings: ChannelSettings = {
    allocationStrategy: "PRIORITIZE_SORTING_ORDER",
    automaticallyConfirmAllNewOrders: true,
    automaticallyFulfillNonShippableGiftCard: true,
    expireOrdersAfter: 30,
    deleteExpiredOrdersAfter: 60,
    markAsPaidStrategy: "TRANSACTION_FLOW",
    allowUnpaidOrders: false,
    automaticallyCompleteFullyPaidCheckouts: true,
    defaultTransactionFlowStrategy: "AUTHORIZATION",
    includeDraftOrderInVoucherUsage: true,
    useLegacyErrorFlow: false,
    ...defaults,
    ...input.settings,
  } satisfies ChannelSettings;

  const channel = {
    ...input,
    settings,
    isActive: input.isActive ?? true,
  } as ChannelProps;

  const identifier = channel.slug ?? channel.name;
  return new Channel(identifier, channel);
}

export const registerAttributes: RegisterAttributesFn = (attributes) => {
  attributes.forEach((attribute) => new Attribute(attribute.name, attribute));
};

export const registerProductTypes: RegisterProductTypesFn = (productTypes) => {
  productTypes.forEach((productType) => new ProductType(productType.name, productType));
};

export const registerProducts: RegisterProductsFn = (products) => {
  products.forEach((product) => new Product(product.slug ?? product.name, product));
};

export const registerWarehouses: RegisterWarehousesFn = (warehouses) => {
  warehouses.forEach((warehouse) => new Warehouse(warehouse.slug ?? warehouse.name, warehouse));
};

export const registerShippingZones: RegisterShippingZonesFn = (shippingZones) => {
  shippingZones.forEach((zone) => new ShippingZone(zone.name, zone));
};

export const registerPageTypes: RegisterPageTypesFn = (pageTypes) => {
  pageTypes.forEach((pageType) => new PageType(pageType.name, pageType));
};
