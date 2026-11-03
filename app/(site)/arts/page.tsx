import type { Metadata } from "next";
import { ArtSection } from "@/components/site/ArtSection";

export const metadata: Metadata = {
  title: "Art",
  description: "A collection of sketches, photography, and digital art by Lyka Mimics."
};

// /arts: the Art section on its own page (the rooms keep the address in step: /arts/sketches...).
export default function ArtsPage() {
  return (
    <main id="main">
      <h1 className="vh">Art · Lyka Mimics</h1>
      <span id="top" />
      <ArtSection syncPath />
    </main>
  );
}
