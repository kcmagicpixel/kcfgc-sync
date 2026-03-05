export function assertNever(val: never): never {
  throw new Error(`Expected never, got ${val}`);
}
