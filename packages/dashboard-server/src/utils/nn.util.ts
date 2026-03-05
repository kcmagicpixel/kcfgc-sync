export function nn<T>(val: T): NonNullable<T> {
  if (val == null) {
    throw new Error(`Expected nullish value, got: ${val}`);
  }
  return val;
}
