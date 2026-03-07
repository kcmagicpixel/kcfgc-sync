/**
 * Minimal markdown processor for social media post text.
 * Handles: links [text](url), bold **text**, italic *text*
 */

interface LinkFacet {
  start: number;
  end: number;
  url: string;
}

// Matches markdown patterns in order of priority
const MD_PATTERN =
  /\[([^\]]*)\]\(([^)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*/g;

/**
 * Strip markdown formatting for providers that don't support rich text.
 * Links are expanded: [text](url) → text (url)
 */
export function stripMarkdown(text: string): string {
  return text.replace(MD_PATTERN, (_match, linkText, linkUrl, bold, italic) => {
    if (linkText != null) return `${linkText} (${linkUrl})`;
    if (bold != null) return bold;
    if (italic != null) return italic;
    return _match;
  });
}

/**
 * Strip markdown formatting for Bluesky, tracking link positions as character indices.
 * Links become just their text: [text](url) → text (with facet tracking the url)
 */
export function stripMarkdownForBluesky(text: string): {
  text: string;
  linkFacets: LinkFacet[];
} {
  const linkFacets: LinkFacet[] = [];
  let result = "";
  let lastIndex = 0;

  for (const match of text.matchAll(MD_PATTERN)) {
    const [full, linkText, linkUrl, bold, italic] = match;
    const matchStart = match.index!;

    // Append text before this match
    result += text.slice(lastIndex, matchStart);

    if (linkText != null) {
      const start = result.length;
      result += linkText;
      linkFacets.push({ start, end: result.length, url: linkUrl });
    } else if (bold != null) {
      result += bold;
    } else if (italic != null) {
      result += italic;
    } else {
      result += full;
    }

    lastIndex = matchStart + full.length;
  }

  result += text.slice(lastIndex);
  return { text: result, linkFacets };
}
