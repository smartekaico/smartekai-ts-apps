const SITE_URL = "https://overlander.smartekai.com";
const SITE_NAME = "Overlander Builder";

/** Tags for search results and for link previews in WhatsApp, Facebook and X. */
export function pageMeta({
  title,
  description,
  path,
  image,
  imageAlt,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  imageAlt?: string;
}) {
  const url = `${SITE_URL}${path}`;
  return {
    meta: [
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(image
        ? [
            { property: "og:image", content: image },
            { name: "twitter:image", content: image },
            ...(imageAlt ? [{ property: "og:image:alt", content: imageAlt }] : []),
          ]
        : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** "A, B, C and 2 more": keeps a description within what search results show. */
export function partSummary(names: string[], shown = 3): string {
  const listed = names.slice(0, shown);
  const extra = names.length - listed.length;
  if (extra > 0) return `${listed.join(", ")} and ${extra} more`;
  if (listed.length < 2) return listed.join("");
  return `${listed.slice(0, -1).join(", ")} and ${listed.at(-1)}`;
}
