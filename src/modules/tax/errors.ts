import { BaseError } from "../../lib/errors/shared";

class TaxError extends BaseError {
  constructor(message: string, code?: string) {
    super(message, code || "TAX_ERROR");
  }
}

export class TaxClassValidationError extends TaxError {
  constructor(message: string) {
    super(`Tax class validation failed: ${message}`, "TAX_CLASS_VALIDATION_ERROR");
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
