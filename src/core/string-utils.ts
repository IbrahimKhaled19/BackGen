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

/**
 * Convert a string to kebab-case.
 * "UserProfile" → "user-profile", "user_profile" → "user-profile"
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * Convert a string to UPPER_SNAKE_CASE.
 * "userProfile" → "USER_PROFILE", "user-profile" → "USER_PROFILE"
 */
export function toUpperSnakeCase(str: string): string {
  return str
    .replace(/[-_\s]+/g, "_")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toUpperCase();
}
