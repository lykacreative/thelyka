"use client";

import { useCallback, useMemo, useState, type ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { BlogImageViewer, type BlogImage } from "@/components/BlogImageViewer";
import { parseBlogBlocks } from "@/lib/blog-blocks";

type BlogRendererProps = {
  content: string;
};

const parseBlocks = parseBlogBlocks;

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
  hr: () => <hr />,
  table: ({ children }) => <div className="overflow-x-auto"><table>{children}</table></div>,
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>
};

type ZoomableImageProps = {
  src?: ComponentProps<"img">["src"];
  alt?: string;
  onOpen: (image: HTMLImageElement) => void;
};

// Every blog image opens bigger in the image viewer when clicked.
function ZoomableImage({ src, alt, onOpen }: ZoomableImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || ""}
      loading="lazy"
      data-lyka-zoom=""
      tabIndex={0}
      onClick={(event) => onOpen(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(event.currentTarget);
        }
      }}
    />
  );
}

export function BlogRenderer({ content }: BlogRendererProps) {
  const blocks = parseBlocks(content);
  const [viewer, setViewer] = useState<{ images: BlogImage[]; index: number } | null>(null);

  // The viewer slides through the post's images in page order, starting at the clicked one.
  const openImage = useCallback((target: HTMLImageElement) => {
    const scope = target.closest(".lyka-prose") ?? document;
    const nodes = Array.from(scope.querySelectorAll<HTMLImageElement>("img[data-lyka-zoom]"));
    setViewer({
      images: nodes.map((node) => ({ src: node.currentSrc || node.src, alt: node.alt })),
      index: Math.max(0, nodes.indexOf(target))
    });
  }, []);

  const showImage = useCallback((index: number) => {
    setViewer((current) => (current ? { ...current, index } : current));
  }, []);

  const closeViewer = useCallback(() => setViewer(null), []);

  const components = useMemo<Components>(
    () => ({
      ...mdComponents,
      img: ({ src, alt }) => <ZoomableImage src={src} alt={alt} onOpen={openImage} />
    }),
    [openImage]
  );

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
                <ZoomableImage src={block.imageSrc} alt={block.imageAlt} onOpen={openImage} />
              </div>
              <div className="lyka-split__text">
                <ReactMarkdown components={components}>{block.text}</ReactMarkdown>
              </div>
            </div>
          );
        }
        return (
          <ReactMarkdown key={i} components={components}>
            {block.content}
          </ReactMarkdown>
        );
      })}

      <BlogImageViewer
        images={viewer?.images ?? []}
        index={viewer?.index ?? null}
        onIndexChange={showImage}
        onClose={closeViewer}
      />
    </>
  );
}