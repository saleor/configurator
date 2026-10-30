import { z } from "zod";

export function removedInSaleor(version: string) {
  const message = `Removed in Saleor ${version}. Delete this field from config.yml.`;

  return z.never({ error: message }).optional().describe(message);
}
