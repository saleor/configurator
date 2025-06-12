import "dotenv/config";

if (!process.env.LOG_LEVEL) {
  throw new Error("LOG_LEVEL is not set");
}

export const LOG_LEVEL = process.env.LOG_LEVEL as string;
