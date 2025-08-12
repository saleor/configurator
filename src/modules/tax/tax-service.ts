import type { TaxRepository } from "./repository";
import type { TaxClassInput, TaxConfigurationInput } from "../config/schema/schema";
import {
  TaxClassValidationError,
  DuplicateTaxClassError,
  InvalidCountryRateError,
} from "./errors";
import type { Logger } from "../../lib/logger";

interface TaxClassWithId extends TaxClassInput {
  id?: string;
}

export interface TaxServiceDependencies {
  repository: TaxRepository;
  logger: Logger;
}

export class TaxService {
  private repository: TaxRepository;
  private logger: Logger;

  constructor({ repository, logger }: TaxServiceDependencies) {
    this.repository = repository;
    this.logger = logger;
  }

  async getAllTaxClasses() {
    this.logger.info("Fetching all tax classes");
    return await this.repository.getAllTaxClasses();
  }

  async getExistingTaxClass(name: string) {
    const taxClasses = await this.getAllTaxClasses();
    return taxClasses.find((taxClass) => taxClass.name === name);
  }

  async createTaxClass(input: TaxClassInput) {
    this.logger.info(`Creating tax class: ${input.name}`);
    
    this.validateTaxClass(input);
    
    const existing = await this.getExistingTaxClass(input.name);
    if (existing) {
      throw new DuplicateTaxClassError(input.name);
    }

    const createInput = {
      name: input.name,
      createCountryRates: input.countryRates?.map((rate) => ({
        countryCode: rate.countryCode,
        rate: rate.rate,
      })),
    };

    return await this.repository.createTaxClass(createInput);
  }

  async updateTaxClass(id: string, input: TaxClassInput) {
    this.logger.info(`Updating tax class: ${id}`);
    
    this.validateTaxClass(input);

    const updateInput = {
      name: input.name,
      updateCountryRates: input.countryRates?.map((rate) => ({
        countryCode: rate.countryCode,
        rate: rate.rate,
      })),
    };

    return await this.repository.updateTaxClass(id, updateInput);
  }

  async deleteTaxClass(id: string) {
    this.logger.info(`Deleting tax class: ${id}`);
    await this.repository.deleteTaxClass(id);
  }

  async getOrCreateTaxClass(input: TaxClassInput): Promise<TaxClassWithId> {
    const existing = await this.getExistingTaxClass(input.name);
    
    if (existing) {
      this.logger.info(`Tax class '${input.name}' already exists`);
      return { ...existing, ...input };
    }

    const created = await this.createTaxClass(input);
    return { ...created, ...input };
  }

  async bootstrapTaxClasses(taxClasses: TaxClassInput[]) {
    this.logger.info(`Bootstrapping ${taxClasses.length} tax classes`);
    
    const results: TaxClassWithId[] = [];
    
    for (const taxClass of taxClasses) {
      const result = await this.bootstrapTaxClass(taxClass);
      results.push(result);
    }

    return results;
  }

  private async bootstrapTaxClass(input: TaxClassInput): Promise<TaxClassWithId> {
    const existing = await this.getExistingTaxClass(input.name);
    
    if (!existing) {
      this.logger.info(`Creating new tax class: ${input.name}`);
      const created = await this.createTaxClass(input);
      return { ...created, ...input };
    }

    this.logger.info(`Updating existing tax class: ${input.name}`);
    
    const needsUpdate = this.taxClassNeedsUpdate(existing, input);
    
    if (needsUpdate) {
      const updated = await this.updateTaxClass(existing.id, input);
      return { ...updated, ...input };
    }

    this.logger.info(`Tax class '${input.name}' is up to date`);
    return { ...existing, ...input };
  }

  async getAllTaxConfigurations() {
    this.logger.info("Fetching all tax configurations");
    return await this.repository.getAllTaxConfigurations();
  }

  async updateChannelTaxConfiguration(channelId: string, input: TaxConfigurationInput) {
    this.logger.info(`Updating tax configuration for channel: ${channelId}`);
    
    const configurations = await this.getAllTaxConfigurations();
    const config = configurations.find((c) => c.channelId === channelId);
    
    if (!config) {
      throw new Error(`Tax configuration for channel ${channelId} not found`);
    }

    return await this.repository.updateTaxConfiguration(config.id, input);
  }

  async syncCountryRates(taxClass: TaxClassWithId) {
    if (!taxClass.countryRates || !taxClass.id) {
      return;
    }

    this.logger.info(`Syncing country rates for tax class: ${taxClass.name}`);

    for (const countryRate of taxClass.countryRates) {
      await this.repository.updateTaxCountryConfiguration(countryRate.countryCode, [
        {
          taxClassId: taxClass.id,
          rate: countryRate.rate,
        },
      ]);
    }
  }

  private validateTaxClass(input: TaxClassInput) {
    if (!input.name.trim()) {
      throw new TaxClassValidationError("Tax class name cannot be empty");
    }

    if (input.countryRates) {
      const countryCodesSeen = new Set<string>();
      
      for (const rate of input.countryRates) {
        if (countryCodesSeen.has(rate.countryCode)) {
          throw new TaxClassValidationError(
            `Duplicate country code '${rate.countryCode}' in tax class '${input.name}'`
          );
        }
        countryCodesSeen.add(rate.countryCode);

        if (rate.rate < 0 || rate.rate > 100) {
          throw new InvalidCountryRateError(rate.countryCode, rate.rate);
        }
      }
    }
  }

  private taxClassNeedsUpdate(existing: { name: string; countryRates?: Array<{ countryCode: string; rate: number }> }, input: TaxClassInput): boolean {
    if (existing.name !== input.name) {
      return true;
    }

    if (!input.countryRates && !existing.countryRates) {
      return false;
    }

    if (!input.countryRates || !existing.countryRates) {
      return true;
    }

    if (input.countryRates.length !== existing.countryRates.length) {
      return true;
    }

    const existingRatesMap = new Map(
      existing.countryRates.map((rate) => [rate.countryCode, rate.rate])
    );

    for (const inputRate of input.countryRates) {
      const existingRate = existingRatesMap.get(inputRate.countryCode);
      if (existingRate === undefined || existingRate !== inputRate.rate) {
        return true;
      }
    }

    return false;
  }

  validateUniqueIdentifiers(taxClasses: TaxClassInput[]) {
    const namesSeen = new Set<string>();
    const duplicates: string[] = [];

    for (const taxClass of taxClasses) {
      if (namesSeen.has(taxClass.name)) {
        duplicates.push(taxClass.name);
      } else {
        namesSeen.add(taxClass.name);
      }
    }

    if (duplicates.length > 0) {
      throw new TaxClassValidationError(
        `Duplicate tax class names found: ${duplicates.join(", ")}`
      );
    }
  }
}