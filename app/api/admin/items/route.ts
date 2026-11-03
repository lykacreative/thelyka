import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import {
  loadAdminItems,
  portfolioCollection,
  readBasics,
  readCategoryFields,
  readCoverIndex,
  readGallery,
  readJson,
  toAdminItem
} from "@/lib/admin-data";
import { run } from "@/lib/admin-route";
import { coverFields, nextFeaturedRank } from "@/lib/item-rules";
import { revalidateSite } from "@/lib/revalidate-site";
import type { PortfolioItemDoc } from "@/lib/portfolio-collection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every item, for the admin list.
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return run(async () => {
    const { db } = await connectToDatabase();
    return NextResponse.json({ items: await loadAdminItems(db) }, { headers: { "Cache-Control": "no-store" } });
  });
}

// A new item from images already uploaded to Cloudinary by the browser.
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return run(async () => {
    const body = await readJson(request);
    const basics = readBasics(body);
    const categoryFields = readCategoryFields(body);
    const gallery = readGallery(body.gallery, []);
    const cover = coverFields(gallery, readCoverIndex(body, gallery));

    const { db } = await connectToDatabase();
    const collection = portfolioCollection(db);
    let featured: number | null = null;
    if (body.featured === true) {
      const ranks = await collection.find({ featured: { $gt: 0 } }, { projection: { featured: 1 } }).toArray();
      featured = nextFeaturedRank(ranks.map((doc) => doc.featured));
    }

    const now = new Date();
    const doc: PortfolioItemDoc = {
      ...basics,
      ...categoryFields,
      ...cover,
      gallery,
      featured,
      createdAt: now,
      updatedAt: now
    };
    const result = await collection.insertOne(doc);
    revalidateSite("portfolio");
    return NextResponse.json({ item: toAdminItem({ ...doc, _id: result.insertedId }) });
  });
}
