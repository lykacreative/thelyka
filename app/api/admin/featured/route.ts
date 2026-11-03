import { NextResponse } from "next/server";
import type { AnyBulkWriteOperation } from "mongodb";
import { requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { InputError, portfolioCollection, readJson } from "@/lib/admin-data";
import { run } from "@/lib/admin-route";
import { featuredRanks } from "@/lib/item-rules";
import { revalidateSite } from "@/lib/revalidate-site";
import type { PortfolioItemDoc } from "@/lib/portfolio-collection";

export const runtime = "nodejs";

// The whole Featured list in its new order: these items get ranks 1..n, every other item gets null.
// (Doesn't touch updatedAt, so an item open in the editor doesn't count as changed elsewhere.)
export async function PUT(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return run(async () => {
    const body = await readJson(request);
    if (!Array.isArray(body.ids) || body.ids.some((id) => typeof id !== "string")) {
      throw new InputError("ids must be a list of item ids.");
    }
    const ranks = featuredRanks(body.ids as string[]);
    if (ranks.size > 500) throw new InputError("Too many featured items.");

    const { db } = await connectToDatabase();
    const collection = portfolioCollection(db);
    const docs = await collection.find({}, { projection: { _id: 1, featured: 1 } }).toArray();
    const known = new Set(docs.map((doc) => String(doc._id)));
    const missing = [...ranks.keys()].filter((id) => !known.has(id));
    if (missing.length) throw new InputError("Some featured items no longer exist. Reload the admin.");

    const operations: AnyBulkWriteOperation<PortfolioItemDoc>[] = [];
    for (const doc of docs) {
      const rank = ranks.get(String(doc._id)) ?? null;
      if ((doc.featured ?? null) !== rank) {
        operations.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { featured: rank } } } });
      }
    }
    if (operations.length) await collection.bulkWrite(operations, { ordered: false });

    revalidateSite("portfolio");
    return NextResponse.json({ featured: Object.fromEntries(ranks) });
  });
}
