// A blog post's text split into plain Markdown pieces and ":::split" image + text pieces. Shared by the admin
// preview and the public post page (components/site/ZineBody.tsx), so both read a post the same way.
// Pure (no imports) so the tests can load it.

export type BlogBlock =
  | { type: "markdown"; content: string }
  | { type: "split"; imageSrc: string; imageAlt: string; text: string; side: "left" | "right" };

export function parseBlogBlocks(content: string): BlogBlock[] {
  const blocks: BlogBlock[] = [];
  const splitRegex = /:::split(?:\s+(right))?\s*\n([\s\S]*?)\n:::\s*\n([\s\S]*?)\n:::/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = splitRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const before = content.slice(lastIndex, match.index);
      if (before.trim()) {
        blocks.push({ type: "markdown", content: before });
      }
    }

    const sideFlag = match[1];
    const imagePart = match[2].trim();
    const textPart = match[3].trim();
    const imageMatch = imagePart.match(/!\[([^\]]*)\]\(([^)]+)\)/);

    if (imageMatch) {
      blocks.push({
        type: "split",
        imageSrc: imageMatch[2],
        imageAlt: imageMatch[1],
        text: textPart,
        side: sideFlag === "right" ? "right" : "left"
      });
    } else {
      blocks.push({ type: "markdown", content: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining.trim()) {
      blocks.push({ type: "markdown", content: remaining });
    }
  }

  return blocks;
}
