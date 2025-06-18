import { logger } from "../../lib/logger";
import type { ChannelService } from "../channel/channel-service";
import type { ShippingRepository } from "./repository";

export interface ShippingZoneInput {
  name: string;
  description?: string;
  countries: string[];
  channels?: string[];
  shippingMethods?: ShippingMethodInput[];
}

export interface ShippingMethodInput {
  name: string;
  description?: string;
  type?: "PRICE" | "WEIGHT";
  maximumOrderWeight?: number;
  minimumOrderWeight?: number;
  channelListings?: ShippingMethodChannelListing[];
  postalCodeRules?: PostalCodeRule[];
}

export interface ShippingMethodChannelListing {
  channelSlug: string;
  price: number;
  minimumOrderPrice?: number;
  maximumOrderPrice?: number;
}

export interface PostalCodeRule {
  start: string;
  end?: string;
  inclusionType?: "INCLUDE" | "EXCLUDE";
}

export class ShippingService {
  constructor(
    private readonly repository: ShippingRepository,
    private readonly channelService: ChannelService
  ) {}

  async upsertShippingZones(zones: ShippingZoneInput[]) {
    logger.info(`Upserting ${zones.length} shipping zones`);
    
    const existingZones = await this.repository.getShippingZones();
    const existingZoneMap = new Map(
      existingZones.map((zone: any) => [zone.name, zone])
    );
    
    const results = [];
    
    for (const zoneInput of zones) {
      try {
        const existingZone = existingZoneMap.get(zoneInput.name);
        let zone;
        
        if (existingZone) {
          logger.debug(`Updating existing shipping zone: ${zoneInput.name}`);
          zone = await this.updateShippingZone(existingZone.id, zoneInput);
        } else {
          logger.debug(`Creating new shipping zone: ${zoneInput.name}`);
          zone = await this.createShippingZone(zoneInput);
        }
        
        results.push(zone);
      } catch (error) {
        logger.error(`Failed to upsert shipping zone ${zoneInput.name}`, { error });
        throw error;
      }
    }
    
    return results;
  }

  private async createShippingZone(input: ShippingZoneInput) {
    const createInput = {
      name: input.name,
      description: input.description,
      countries: input.countries,
    };
    
    const zone = await this.repository.createShippingZone(createInput);
    
    if (zone && input.channels?.length) {
      const channels = await this.channelService.getChannelsBySlug(input.channels);
      const channelIds = channels.map((c: any) => c.id);
      await this.repository.assignChannelsToShippingZone(zone.id, channelIds);
    }
    
    if (input.shippingMethods?.length) {
      await this.createShippingMethods(zone.id, input.shippingMethods);
    }
    
    return zone;
  }

  private async updateShippingZone(id: string, input: ShippingZoneInput) {
    const updateInput = {
      name: input.name,
      description: input.description,
      countries: input.countries,
    };
    
    const zone = await this.repository.updateShippingZone(id, updateInput);
    
    if (input.channels?.length) {
      const channels = await this.channelService.getChannelsBySlug(input.channels);
      const channelIds = channels.map((c: any) => c.id);
      await this.repository.assignChannelsToShippingZone(zone.id, channelIds);
    }
    
    if (input.shippingMethods?.length) {
      await this.syncShippingMethods(zone, input.shippingMethods);
    }
    
    return zone;
  }

  private async createShippingMethods(
    shippingZoneId: string, 
    methods: ShippingMethodInput[]
  ) {
    const results = [];
    
    for (const method of methods) {
      const createInput = {
        shippingZone: shippingZoneId,
        name: method.name,
        description: method.description,
        type: method.type || "PRICE",
        maximumOrderWeight: method.maximumOrderWeight,
        minimumOrderWeight: method.minimumOrderWeight,
      };
      
      const shippingMethod = await this.repository.createShippingMethod(createInput);
      
      if (method.channelListings?.length) {
        await this.updateShippingMethodChannelListings(
          shippingMethod.id, 
          method.channelListings
        );
      }
      
      if (method.postalCodeRules?.length) {
        await this.createPostalCodeRules(shippingMethod.id, method.postalCodeRules);
      }
      
      results.push(shippingMethod);
    }
    
    return results;
  }

  private async syncShippingMethods(zone: any, methods: ShippingMethodInput[]) {
    const existingMethods = zone.shippingMethods || [];
    const existingMethodMap = new Map(
      existingMethods.map((m: any) => [m.name, m])
    );
    
    for (const methodInput of methods) {
      const existingMethod = existingMethodMap.get(methodInput.name);
      
      if (existingMethod) {
        await this.updateShippingMethod(existingMethod.id, methodInput);
      } else {
        await this.createShippingMethods(zone.id, [methodInput]);
      }
    }
  }

  private async updateShippingMethod(id: string, input: ShippingMethodInput) {
    const updateInput = {
      name: input.name,
      description: input.description,
      type: input.type,
      maximumOrderWeight: input.maximumOrderWeight,
      minimumOrderWeight: input.minimumOrderWeight,
    };
    
    const method = await this.repository.updateShippingMethod(id, updateInput);
    
    if (input.channelListings) {
      await this.updateShippingMethodChannelListings(id, input.channelListings);
    }
    
    if (input.postalCodeRules) {
      await this.createPostalCodeRules(id, input.postalCodeRules);
    }
    
    return method;
  }

  private async updateShippingMethodChannelListings(
    methodId: string,
    listings: ShippingMethodChannelListing[]
  ) {
    for (const listing of listings) {
      const channels = await this.channelService.getChannelsBySlug([listing.channelSlug]);
      
      if (channels.length === 0) {
        throw new Error(`Channel not found: ${listing.channelSlug}`);
      }
      
      const updateInput = {
        shippingMethod: methodId,
        channelListing: {
          channelId: channels[0].id,
          price: listing.price,
          minimumOrderPrice: listing.minimumOrderPrice,
          maximumOrderPrice: listing.maximumOrderPrice,
        },
      };
      
      await this.repository.updateShippingMethod(methodId, updateInput);
    }
  }

  private async createPostalCodeRules(
    methodId: string,
    rules: PostalCodeRule[]
  ) {
    for (const rule of rules) {
      await this.repository.createPostalCodeRule(methodId, rule);
    }
  }
} 