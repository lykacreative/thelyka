/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { parseBlogBlocks } from "@/lib/blog-blocks";

// A post's text in the fanzine look: headings start at h2 (the title is the page's h1), every picture is a
// button that opens it bigger (ZineLightbox), with its alt text as the caption; ":::split" pieces sit
// picture-beside-text.

function Figure({ src, alt }: { src?: string; alt?: string }) {
  if (!src) return null;
  const text = alt ?? "";
  return (
    <figure className="zn-fig">
      <button className="zn-imgbtn" type="button" data-zoom="" aria-label={text ? `Bigger: ${text}` : "Bigger image"}>
        <img src={src} alt={text} loading="lazy" decoding="async" />
      </button>
      {text ? <figcaption>{text}</figcaption> : null}
    </figure>
  );
}

type Node = { children?: { type: string; tagName?: string; value?: string }[] };

const components: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
  h2: ({ children }) => <h2>{children}</h2>,
  h3: ({ children }) => <h3>{children}</h3>,
  h4: ({ children }) => <h4>{children}</h4>,
  // a paragraph that is only a picture becomes the picture; text with pictures in it stays a block
  p: ({ node, children }) => {
    const kids = (node as Node | undefined)?.children ?? [];
    const pictures = kids.filter((kid) => kid.type === "element" && kid.tagName === "img").length;
    if (!pictures) return <p>{children}</p>;
    const words = kids.some((kid) => (kid.type === "text" && kid.value?.trim()) || (kid.type === "element" && kid.tagName !== "img"));
    return words ? <div className="zn-p">{children}</div> : <>{children}</>;
  },
  a: ({ href, children }) =>
    href && /^https?:\/\//i.test(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <>{children}</>
    ),
  img: ({ src, alt }) => <Figure src={typeof src === "string" ? src : undefined} alt={alt} />
};

function Markdown({ children }: { children: string }): ReactNode {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
}

export function ZineBody({ content }: { content: string }) {
  return (
    <div className="zn-body">
      {parseBlogBlocks(content).map((block, i) =>
        block.type === "split" ? (
          <div key={i} className={`zn-split${block.side === "right" ? " right" : ""}`}>
            <div className="zn-split-img">
              <Figure src={block.imageSrc} alt={block.imageAlt} />
            </div>
            <div className="zn-split-txt">
              <Markdown>{block.text}</Markdown>
            </div>
          </div>
        ) : (
          <Markdown key={i}>{block.content}</Markdown>
        )
      )}
    </div>
  );
}
