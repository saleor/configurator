/**
 * Lists the fields whose local and remote values differ, in the order given.
 */
export function findChangedFields<T extends object>(
  local: T,
  remote: T,
  fields: ReadonlyArray<keyof T>
): Array<keyof T> {
  return fields.filter((field) => local[field] !== remote[field]);
}
