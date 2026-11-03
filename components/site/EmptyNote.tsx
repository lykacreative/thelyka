import type { ReactNode } from "react";

// What a section shows while it has nothing in it yet (a fresh database before "copy live items", a room with no
// pieces): the blog index's "nothing here" card, in the colours of the section it sits in.
export function EmptyNote({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`sec-empty ${className}`.trim()}>
      <p className="sec-empty-t">{title}</p>
      <p>{children}</p>
    </div>
  );
}
