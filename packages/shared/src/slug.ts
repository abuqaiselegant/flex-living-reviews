/**
 * Convert a string to a URL-friendly slug
 * @param input - The string to slugify
 * @returns A slugified string
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Simple test function for slugify
 * Run with: node -e "require('./slug').runSlugTests()"
 */
export function runSlugTests(): void {
  const assert = (condition: boolean, message: string) => {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  };

  // Test 1: Basic string with spaces
  assert(slugify('Hello World') === 'hello-world', 'Basic spaces to hyphens');

  // Test 2: String with multiple spaces
  assert(slugify('Hello   World') === 'hello-world', 'Multiple spaces collapse to single hyphen');

  // Test 3: String with special characters
  assert(slugify('Hello, World!') === 'hello-world', 'Special characters removed');

  // Test 4: String with leading/trailing spaces and hyphens
  assert(slugify('  -Hello World-  ') === 'hello-world', 'Leading/trailing spaces and hyphens stripped');

  // Test 5: String with numbers
  assert(slugify('Product 123') === 'product-123', 'Numbers preserved');

  // Test 6: String with mixed case and special chars
  assert(slugify('CamelCase & Special@Chars#') === 'camelcase-specialchars', 'Mixed case lowercased, special chars removed');

  // Test 7: String with multiple hyphens
  assert(slugify('Hello---World') === 'hello-world', 'Multiple hyphens collapse');

  // Test 8: Complex real-world example
  assert(slugify('  The "Best" Apartment (2024)! ') === 'the-best-apartment-2024', 'Complex real-world string');

  console.log('✓ All slugify tests passed!');
}
