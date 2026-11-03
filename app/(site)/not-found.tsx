import Link from "next/link";

// A page that isn't there, in the site's look (nav and footer stay).
export default function NotFound() {
  return (
    <main id="main" className="sec lost">
      <span id="top" />
      <h1 className="script">Not here</h1>
      <p>This page isn’t on the shelf. Try the home page.</p>
      <Link className="pill" href="/">
        Home
      </Link>
    </main>
  );
}
