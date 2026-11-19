/**
 * Serialises structured data for a <script type="application/ld+json"> tag.
 * Escapes "<" so text such as "</script>" in a product description can't break out of the tag.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
