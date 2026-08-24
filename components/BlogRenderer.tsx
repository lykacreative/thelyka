"use client";

import ReactMarkdown, { type Components } from "react-markdown";

type BlogRendererProps = {
  content: string;
};

type Block =
  | { type: "markdown"; content: string }
  | { type: "split"; imageSrc: string; imageAlt: string; text: string; side: "left" | "right" };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
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

const mdComponents: Components = {
  h1: ({ children }) => <h1>{children}</h1>,
  h2: ({ children }) => <h2>{children}</h2>,
  h3: ({ children }) => <h3>{children}</h3>,
  h4: ({ children }) => <h4>{children}</h4>,
  p: ({ children }) => <p>{children}</p>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul>{children}</ul>,
  ol: ({ children }) => <ol>{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  code: ({ className, children }) => {
    const isInline = !className;
    if (isInline) return <code>{children}</code>;
    return (
      <pre>
        <code className={className}>{children}</code>
      </pre>
    );
  },
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt || ""} loading="lazy" />
  ),
  hr: () => <hr />,
  table: ({ children }) => <div className="overflow-x-auto"><table>{children}</table></div>,
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>
};

export function BlogRenderer({ content }: BlogRendererProps) {
  const blocks = parseBlocks(content);

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "split") {
          return (
            <div
              key={i}
              className={`lyka-split${block.side === "right" ? " lyka-split--right" : ""}`}
            >
              <div className="lyka-split__image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.imageSrc} alt={block.imageAlt} loading="lazy" />
              </div>
              <div className="lyka-split__text">
                <ReactMarkdown components={mdComponents}>{block.text}</ReactMarkdown>
              </div>
            </div>
          );
        }
        return (
          <ReactMarkdown key={i} components={mdComponents}>
            {block.content}
          </ReactMarkdown>
        );
      })}
    </>
  );
}