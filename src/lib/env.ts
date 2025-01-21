if (!process.env.APP_TOKEN) {
  throw new Error("APP_TOKEN is not set");
}

if (!process.env.SALEOR_API_URL) {
  throw new Error("SALEOR_API_URL is not set");
}

export const APP_TOKEN = process.env.APP_TOKEN as string;
export const SALEOR_API_URL = process.env.SALEOR_API_URL as string;
