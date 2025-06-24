import { logger } from "../lib/logger";
import type { ServiceContainer } from "./service-container";
import type { SaleorConfig } from "../modules/config/schema";
import type { 
  DiffResult, 
  DiffSummary, 
  DiffChange, 
  DiffOperation 
} from "../lib/types/diff";

export class DiffService {
  constructor(private readonly services: ServiceContainer) {}

  async compare(): Promise<DiffSummary> {
    logger.info("Starting diff comparison");
    
    try {
      // Load local configuration
      const localConfig = await this.services.configStorage.load();
      logger.debug("Local configuration loaded", { config: localConfig });

      // Fetch remote configuration (without saving to local file)
      const remoteConfig = await this.services.configuration.retrieveWithoutSaving();
      logger.debug("Remote configuration retrieved", { config: remoteConfig });

      // Compare configurations
      const results: DiffResult[] = [];

      // Compare shop settings
      if (localConfig.shop || remoteConfig.shop) {
        results.push(...this.compareShopSettings(localConfig.shop, remoteConfig.shop));
      }

      // Compare channels
      results.push(...this.compareChannels(localConfig.channels || [], remoteConfig.channels || []));

      // Compare product types
      results.push(...this.compareProductTypes(localConfig.productTypes || [], remoteConfig.productTypes || []));

      // Compare page types
      results.push(...this.comparePageTypes(localConfig.pageTypes || [], remoteConfig.pageTypes || []));

      // Compare categories
      results.push(...this.compareCategories(localConfig.categories || [], remoteConfig.categories || []));

      // Calculate summary
      const summary: DiffSummary = {
        totalChanges: results.length,
        creates: results.filter(r => r.operation === "CREATE").length,
        updates: results.filter(r => r.operation === "UPDATE").length,
        deletes: results.filter(r => r.operation === "DELETE").length,
        results,
      };

      logger.info("Diff comparison completed", { 
        totalChanges: summary.totalChanges,
        creates: summary.creates,
        updates: summary.updates,
        deletes: summary.deletes,
      });

      return summary;
    } catch (error) {
      logger.error("Failed to compare configurations", { error });
      throw error;
    }
  }

  private compareShopSettings(
    local: SaleorConfig["shop"], 
    remote: SaleorConfig["shop"]
  ): DiffResult[] {
    if (!local && !remote) return [];
    
    if (!local && remote) {
      return [{
        operation: "DELETE",
        entityType: "Shop Settings",
        entityName: "Shop Settings",
        current: remote,
      }];
    }

    if (local && !remote) {
      return [{
        operation: "CREATE",
        entityType: "Shop Settings",
        entityName: "Shop Settings",
        desired: local,
      }];
    }

    if (!local || !remote) return [];

    const changes: DiffChange[] = [];
    
    // Compare specific shop settings
    const fieldsToCompare = [
      'defaultMailSenderName',
      'defaultMailSenderAddress', 
      'displayGrossPrices',
      'enableAccountConfirmationByEmail',
      'limitQuantityPerCheckout',
      'trackInventoryByDefault',
      'reserveStockDurationAnonymousUser',
      'reserveStockDurationAuthenticatedUser',
      'defaultDigitalMaxDownloads',
      'defaultDigitalUrlValidDays',
      'defaultWeightUnit',
      'allowLoginWithoutConfirmation',
    ] as const;

    for (const field of fieldsToCompare) {
      const localValue = (local as any)[field];
      const remoteValue = (remote as any)[field];
      if (localValue !== remoteValue) {
        changes.push({
          field,
          currentValue: remoteValue,
          desiredValue: localValue,
          description: `${field} changed from "${remoteValue}" to "${localValue}"`,
        });
      }
    }

    if (changes.length > 0) {
      return [{
        operation: "UPDATE",
        entityType: "Shop Settings",
        entityName: "Shop Settings",
        current: remote,
        desired: local,
        changes,
      }];
    }

    return [];
  }

  private compareChannels(
    local: NonNullable<SaleorConfig["channels"]>,
    remote: NonNullable<SaleorConfig["channels"]>
  ): DiffResult[] {
    const results: DiffResult[] = [];
    const remoteByName = new Map(remote.map(c => [c.name, c]));
    const localByName = new Map(local.map(c => [c.name, c]));

    // Check for creates and updates
    for (const localChannel of local) {
      const remoteChannel = remoteByName.get(localChannel.name);
      
      if (!remoteChannel) {
        // Channel needs to be created
        results.push({
          operation: "CREATE",
          entityType: "Channels",
          entityName: localChannel.name,
          desired: localChannel,
        });
      } else {
        // Check for updates
        const changes = this.compareChannelFields(localChannel, remoteChannel);
        if (changes.length > 0) {
          results.push({
            operation: "UPDATE",
            entityType: "Channels", 
            entityName: localChannel.name,
            current: remoteChannel,
            desired: localChannel,
            changes,
          });
        }
      }
    }

    // Check for deletes
    for (const remoteChannel of remote) {
      if (!localByName.has(remoteChannel.name)) {
        results.push({
          operation: "DELETE",
          entityType: "Channels",
          entityName: remoteChannel.name,
          current: remoteChannel,
        });
      }
    }

    return results;
  }

  private compareChannelFields(local: any, remote: any): DiffChange[] {
    const changes: DiffChange[] = [];
    
    const fieldsToCompare = ['currencyCode', 'defaultCountry', 'slug'];
    
    for (const field of fieldsToCompare) {
      if (local[field] !== remote[field]) {
        changes.push({
          field,
          currentValue: remote[field],
          desiredValue: local[field],
        });
      }
    }

    // Compare settings if they exist
    if (local.settings || remote.settings) {
      const localSettings = local.settings || {};
      const remoteSettings = remote.settings || {};
      
      const settingsFields = [
        'allocationStrategy',
        'automaticallyConfirmAllNewOrders',
        'automaticallyFulfillNonShippableGiftCard',
        'expireOrdersAfter',
        'deleteExpiredOrdersAfter',
        'markAsPaidStrategy',
        'allowUnpaidOrders',
        'includeDraftOrderInVoucherUsage',
        'useLegacyErrorFlow',
        'automaticallyCompleteFullyPaidCheckouts',
        'defaultTransactionFlowStrategy',
      ];
      
      for (const field of settingsFields) {
        if (localSettings[field] !== remoteSettings[field]) {
          changes.push({
            field: `settings.${field}`,
            currentValue: remoteSettings[field],
            desiredValue: localSettings[field],
          });
        }
      }
    }

    return changes;
  }

  private compareProductTypes(
    local: NonNullable<SaleorConfig["productTypes"]>,
    remote: NonNullable<SaleorConfig["productTypes"]>
  ): DiffResult[] {
    const results: DiffResult[] = [];
    const remoteByName = new Map(remote.map(pt => [pt.name, pt]));
    const localByName = new Map(local.map(pt => [pt.name, pt]));

    // Check for creates and updates
    for (const localPT of local) {
      const remotePT = remoteByName.get(localPT.name);
      
      if (!remotePT) {
        results.push({
          operation: "CREATE",
          entityType: "Product Types",
          entityName: localPT.name,
          desired: localPT,
        });
      } else {
        // Check for updates (compare attributes if they exist)
        const changes = this.compareProductTypeFields(localPT, remotePT);
        if (changes.length > 0) {
          results.push({
            operation: "UPDATE",
            entityType: "Product Types",
            entityName: localPT.name,
            current: remotePT,
            desired: localPT,
            changes,
          });
        }
      }
    }

    // Check for deletes
    for (const remotePT of remote) {
      if (!localByName.has(remotePT.name)) {
        results.push({
          operation: "DELETE",
          entityType: "Product Types",
          entityName: remotePT.name,
          current: remotePT,
        });
      }
    }

    return results;
  }

  private compareProductTypeFields(local: any, remote: any): DiffChange[] {
    const changes: DiffChange[] = [];
    
    // Compare attributes if they exist
    if ('attributes' in local || 'attributes' in remote) {
      const localAttrs = local.attributes || [];
      const remoteAttrs = remote.attributes || [];
      
      const localAttrNames = new Set(localAttrs.map((a: any) => a.name));
      const remoteAttrNames = new Set(remoteAttrs.map((a: any) => a.name));
      
      // Find added attributes
      for (const attr of localAttrs) {
        if (!remoteAttrNames.has(attr.name)) {
          changes.push({
            field: 'attributes',
            currentValue: null,
            desiredValue: attr.name,
            description: `Attribute "${attr.name}" added (in config, not on Saleor)`,
          });
        }
      }
      
      // Find removed attributes
      for (const attr of remoteAttrs) {
        if (!localAttrNames.has(attr.name)) {
          changes.push({
            field: 'attributes',
            currentValue: attr.name,
            desiredValue: null,
            description: `Attribute "${attr.name}" removed (on Saleor, not in config)`,
          });
        }
      }
    }

    return changes;
  }

  private comparePageTypes(
    local: NonNullable<SaleorConfig["pageTypes"]>,
    remote: NonNullable<SaleorConfig["pageTypes"]>
  ): DiffResult[] {
    const results: DiffResult[] = [];
    const remoteByName = new Map(remote.map(pt => [pt.name, pt]));
    const localByName = new Map(local.map(pt => [pt.name, pt]));

    // Check for creates and updates
    for (const localPT of local) {
      const remotePT = remoteByName.get(localPT.name);
      
      if (!remotePT) {
        results.push({
          operation: "CREATE",
          entityType: "Page Types",
          entityName: localPT.name,
          desired: localPT,
        });
      } else {
        // Check for updates
        const changes = this.comparePageTypeFields(localPT, remotePT);
        if (changes.length > 0) {
          results.push({
            operation: "UPDATE",
            entityType: "Page Types",
            entityName: localPT.name,
            current: remotePT,
            desired: localPT,
            changes,
          });
        }
      }
    }

    // Check for deletes
    for (const remotePT of remote) {
      if (!localByName.has(remotePT.name)) {
        results.push({
          operation: "DELETE",
          entityType: "Page Types",
          entityName: remotePT.name,
          current: remotePT,
        });
      }
    }

    return results;
  }

  private comparePageTypeFields(local: any, remote: any): DiffChange[] {
    const changes: DiffChange[] = [];
    
    // Compare slug if it exists
    if (local.slug !== remote.slug) {
      changes.push({
        field: 'slug',
        currentValue: remote.slug,
        desiredValue: local.slug,
      });
    }
    
    // Compare attributes if they exist
    if ('attributes' in local || 'attributes' in remote) {
      const localAttrs = local.attributes || [];
      const remoteAttrs = remote.attributes || [];
      
      const localAttrNames = new Set(localAttrs.map((a: any) => a.name));
      const remoteAttrNames = new Set(remoteAttrs.map((a: any) => a.name));
      
      // Find added attributes
      for (const attr of localAttrs) {
        if (!remoteAttrNames.has(attr.name)) {
          changes.push({
            field: 'attributes',
            currentValue: null,
            desiredValue: attr.name,
            description: `Attribute "${attr.name}" added (in config, not on Saleor)`,
          });
        }
      }
      
      // Find removed attributes
      for (const attr of remoteAttrs) {
        if (!localAttrNames.has(attr.name)) {
          changes.push({
            field: 'attributes',
            currentValue: attr.name,
            desiredValue: null,
            description: `Attribute "${attr.name}" removed (on Saleor, not in config)`,
          });
        }
      }
    }

    return changes;
  }

  private compareCategories(
    local: NonNullable<SaleorConfig["categories"]>,
    remote: NonNullable<SaleorConfig["categories"]>
  ): DiffResult[] {
    const results: DiffResult[] = [];
    const remoteByName = new Map(remote.map(c => [c.name, c]));
    const localByName = new Map(local.map(c => [c.name, c]));

    // Check for creates and updates
    for (const localCat of local) {
      const remoteCat = remoteByName.get(localCat.name);
      
      if (!remoteCat) {
        results.push({
          operation: "CREATE",
          entityType: "Categories",
          entityName: localCat.name,
          desired: localCat,
        });
      } else {
        // Check for updates (compare subcategories if they exist)
        const changes = this.compareCategoryFields(localCat, remoteCat);
        if (changes.length > 0) {
          results.push({
            operation: "UPDATE",
            entityType: "Categories",
            entityName: localCat.name,
            current: remoteCat,
            desired: localCat,
            changes,
          });
        }
      }
    }

    // Check for deletes
    for (const remoteCat of remote) {
      if (!localByName.has(remoteCat.name)) {
        results.push({
          operation: "DELETE",
          entityType: "Categories",
          entityName: remoteCat.name,
          current: remoteCat,
        });
      }
    }

    return results;
  }

  private compareCategoryFields(local: any, remote: any): DiffChange[] {
    const changes: DiffChange[] = [];
    
    // Compare slug if it exists
    if (local.slug && remote.slug && local.slug !== remote.slug) {
      changes.push({
        field: 'slug',
        currentValue: remote.slug,
        desiredValue: local.slug,
      });
    }
    
    // Compare subcategories if they exist
    if ('subcategories' in local || 'subcategories' in remote) {
      const localSubcats = local.subcategories || [];
      const remoteSubcats = remote.subcategories || [];
      
      const localSubcatNames = new Set(localSubcats.map((s: any) => s.name));
      const remoteSubcatNames = new Set(remoteSubcats.map((s: any) => s.name));
      
      // Find added subcategories
      for (const subcat of localSubcats) {
        if (!remoteSubcatNames.has(subcat.name)) {
          changes.push({
            field: 'subcategories',
            currentValue: null,
            desiredValue: subcat.name,
            description: `Subcategory "${subcat.name}" added (in config, not on Saleor)`,
          });
        }
      }
      
      // Find removed subcategories
      for (const subcat of remoteSubcats) {
        if (!localSubcatNames.has(subcat.name)) {
          changes.push({
            field: 'subcategories',
            currentValue: subcat.name,
            desiredValue: null,
            description: `Subcategory "${subcat.name}" removed (on Saleor, not in config)`,
          });
        }
      }
    }

    return changes;
  }
} 