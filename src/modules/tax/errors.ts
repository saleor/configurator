import { BaseError } from "../../lib/errors/shared";

export class TaxError extends BaseError {
  constructor(message: string, code?: string) {
    super(message, code || "TAX_ERROR");
  }
}

export class TaxClassNotFoundError extends TaxError {
  constructor(name: string) {
    super(`Tax class '${name}' not found`, "TAX_CLASS_NOT_FOUND");
  }
}

export class TaxConfigurationNotFoundError extends TaxError {
  constructor(channelId: string) {
    super(`Tax configuration for channel '${channelId}' not found`, "TAX_CONFIGURATION_NOT_FOUND");
  }
}

export class TaxClassValidationError extends TaxError {
  constructor(message: string) {
    super(`Tax class validation failed: ${message}`, "TAX_CLASS_VALIDATION_ERROR");
  }
}

export class TaxRateValidationError extends TaxError {
  constructor(message: string) {
    super(`Tax rate validation failed: ${message}`, "TAX_RATE_VALIDATION_ERROR");
  }
}

export class TaxClassInUseError extends TaxError {
  constructor(name: string, references: string[]) {
    super(
      `Tax class '${name}' cannot be deleted because it is referenced by: ${references.join(", ")}`,
      "TAX_CLASS_IN_USE"
    );
  }
}

export class DuplicateTaxClassError extends TaxError {
  constructor(name: string) {
    super(`Tax class '${name}' already exists`, "DUPLICATE_TAX_CLASS");
  }
}

export class InvalidCountryRateError extends TaxError {
  constructor(countryCode: string, rate: number) {
    super(
      `Invalid tax rate ${rate}% for country ${countryCode}. Rate must be between 0 and 100`,
      "INVALID_COUNTRY_RATE"
    );
  }
}