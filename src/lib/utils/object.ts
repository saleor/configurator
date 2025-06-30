/**
 * Filters out properties with undefined values from an object
 * @param obj Object to filter
 * @returns New object without undefined values
 */
const filterUndefinedValues = <T extends Record<string, unknown>>(obj: T) => {
  const entries = Object.entries(obj).filter(([_, value]) => value !== undefined);
  return Object.fromEntries(entries);
};

export const object = {
  filterUndefinedValues,
};
