import { logger } from "../../lib/logger";
import type { ChannelService } from "../channel/channel-service";
import type { TaxRepository } from "./repository";

export interface TaxClassInput {
  name: string;
  countryRates?: Array<{
    countryCode: string;
    rate: number;
  }>;
}

export interface TaxConfigurationInput {
  channelSlug: string;
  chargeTaxes?: boolean;
  displayGrossPrices?: boolean;
  pricesEnteredWithTax?: boolean;
  countryExceptions?: Array<{
    countryCode: string;
    chargeTaxes?: boolean;
    displayGrossPrices?: boolean;
  }>;
}

export class TaxService {
  constructor(
    private readonly repository: TaxRepository,
    private readonly channelService: ChannelService
  ) {}

  async upsertTaxClasses(classes: TaxClassInput[]) {
    logger.info(`Upserting ${classes.length} tax classes`);
    
    const existingClasses = await this.repository.getTaxClasses();
    const existingClassMap = new Map(
      existingClasses.map((taxClass) => [taxClass.name, taxClass])
    );
    
    const results = [];
    
    for (const classInput of classes) {
      try {
        const existingClass = existingClassMap.get(classInput.name);
        let taxClass;
        
        if (existingClass) {
          logger.debug(`Updating existing tax class: ${classInput.name}`);
          taxClass = await this.repository.updateTaxClass(existingClass.id, {
            name: classInput.name,
          });
        } else {
          logger.debug(`Creating new tax class: ${classInput.name}`);
          taxClass = await this.repository.createTaxClass({
            name: classInput.name,
          });
        }
        
        if (classInput.countryRates?.length) {
          logger.debug(`Updating country rates for tax class: ${classInput.name}`);
          taxClass = await this.repository.updateTaxClassCountryRates(
            taxClass.id,
            classInput.countryRates
          );
        }
        
        results.push(taxClass);
      } catch (error) {
        logger.error(`Failed to upsert tax class ${classInput.name}`, { error });
        throw error;
      }
    }
    
    return results;
  }

  async configureTaxSettings(configurations: TaxConfigurationInput[]) {
    logger.info(`Configuring tax settings for ${configurations.length} channels`);
    
    const existingConfigs = await this.repository.getTaxConfigurations();
    const results = [];
    
    for (const configInput of configurations) {
      try {
        const channels = await this.channelService.getChannelsBySlug([
          configInput.channelSlug,
        ]);
        
        if (channels.length === 0) {
          throw new Error(`Channel not found: ${configInput.channelSlug}`);
        }
        
        const channel = channels[0];
        const existingConfig = existingConfigs.find(
          (config) => config.channel.slug === configInput.channelSlug
        );
        
        if (!existingConfig) {
          logger.warn(
            `Tax configuration not found for channel: ${configInput.channelSlug}`
          );
          continue;
        }
        
        logger.debug(`Updating tax configuration for channel: ${configInput.channelSlug}`);
        
        const updateInput = {
          chargeTaxes: configInput.chargeTaxes,
          displayGrossPrices: configInput.displayGrossPrices,
          pricesEnteredWithTax: configInput.pricesEnteredWithTax,
        };
        
        const taxConfiguration = await this.repository.updateTaxConfiguration(
          existingConfig.id,
          updateInput
        );
        
        if (configInput.countryExceptions?.length) {
          logger.debug(
            `Updating country exceptions for channel: ${configInput.channelSlug}`
          );
          await this.repository.updateTaxConfigurationPerCountry(
            existingConfig.id,
            configInput.countryExceptions
          );
        }
        
        results.push(taxConfiguration);
      } catch (error) {
        logger.error(
          `Failed to configure tax settings for channel ${configInput.channelSlug}`,
          { error }
        );
        throw error;
      }
    }
    
    return results;
  }

  async getTaxClasses() {
    logger.debug("Fetching all tax classes");
    return this.repository.getTaxClasses();
  }

  async getTaxConfigurations() {
    logger.debug("Fetching all tax configurations");
    return this.repository.getTaxConfigurations();
  }
} 