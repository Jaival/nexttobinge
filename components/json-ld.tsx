/**
 * Structured data (schema.org) for search engines. It isn't visible on the page;
 * it tells Google "this page is a Movie called X, released Y, starring Z".
 *
 * `<` is escaped so a title or synopsis containing "</script>" can't close the
 * tag early and inject markup. See the Next.js JSON-LD guide.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
