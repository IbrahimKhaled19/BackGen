/**
 * Convert a string to PascalCase.
 * "user_profile" → "UserProfile", "product" → "Product"
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
}

/**
 * Convert a string to camelCase.
 * "user_profile" → "userProfile", "ProductItem" → "productItem"
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
