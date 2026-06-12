"use client";

import ReactMarkdown from "react-markdown";

type BlogRendererProps = {
  content: string;
};

export function BlogRenderer({ content }: BlogRendererProps) {
  return (
    <ReactMarkdown
      components={{
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
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
