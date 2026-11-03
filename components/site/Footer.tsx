import { formatDate, newestItem, type SiteItem } from "@/lib/site-items";
import { SectionLink } from "./SectionLink";
import { TELEGRAM_URL } from "./icons";

// EAN-style bars from the catalogue: how many items there are and the newest one's date.
function barcode(code: string) {
  const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
  const bits = "101" + [...code].map((c) => L[Number(c)] ?? "").join("") + "101";
  const mw = 2;
  const rects: { x: number; w: number }[] = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== "1") continue;
    let j = i;
    while (bits[j + 1] === "1") j++;
    rects.push({ x: i * mw, w: (j - i + 1) * mw });
    i = j;
  }
  return { width: bits.length * mw, rects };
}

export function Footer({ items, postCount }: { items: SiteItem[]; postCount: number }) {
  const count = (category: SiteItem["category"]) => items.filter((item) => item.category === category).length;
  const newest = newestItem(items);
  const newestDate = newest?.date || newest?.year || "";
  const bars = barcode(String(items.length) + newestDate.replace(/\D/g, ""));
  const catalogue = [
    ["design", "Design", count("design")],
    ["art", "Art", count("arts")],
    ["reviews", "Reviews", count("reviews")],
    ["blog", "Blog", postCount]
  ] as const;

  return (
    <footer className="foot" id="foot">
      <div className="foot-in">
        <SectionLink className="foot-brand" section="top">
          <i className="mark" aria-hidden="true" />
          Lyka Mimics
        </SectionLink>
        <div className="foot-cat">
          {catalogue.map(([id, name, n]) => (
            <SectionLink key={id} section={id}>
              {name} <b>{n}</b>
            </SectionLink>
          ))}
        </div>
        <a className="bar" href="#top" aria-label={`Back to top. Catalogue: ${items.length} items, newest ${formatDate(newestDate)}`}>
          <svg viewBox={`0 0 ${bars.width} 54`} width={bars.width} height={54} aria-hidden="true" fill="#171512">
            {bars.rects.map((r) => (
              <rect key={r.x} x={r.x} y={0} width={r.w} height={54} />
            ))}
          </svg>
          <span>
            {items.length} · {newestDate}
          </span>
        </a>
      </div>
      <div className="foot-low">
        <span>© 2026 Lyka Mimics</span>
        <a href={TELEGRAM_URL} target="_blank" rel="noopener">
          t.me/lykamimics ↗
        </a>
      </div>
    </footer>
  );
}
