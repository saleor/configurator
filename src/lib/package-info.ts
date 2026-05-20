import packageJson from "../../package.json";

const SALEOR_MINOR_VERSION_PATTERN = /^\d+\.\d+$/;

export function getPackageVersion(): string {
  return packageJson.version;
}

export function getSupportedSaleorMinor(): string {
  const schemaVersion = packageJson.saleor.schemaVersion;

  if (!SALEOR_MINOR_VERSION_PATTERN.test(schemaVersion)) {
    throw new Error(
      `package.json saleor.schemaVersion must be a Saleor minor version like "3.23", received "${schemaVersion}"`
    );
  }

  return schemaVersion;
}
