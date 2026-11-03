import { NextResponse } from "next/server";
import type { Document } from "mongodb";
import { requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase, connectToUriDatabase } from "@/lib/mongodb";
import { copyLiveSettingsRefusal, copyLiveStatus } from "@/lib/admin-env";
import { run } from "@/lib/admin-route";
import { PORTFOLIO_COLLECTION } from "@/lib/portfolio-collection";
import { BLOG_COLLECTION, BLOG_MIGRATION_ID, SITE_META_COLLECTION, ensureBlogIndexes } from "@/lib/blog-store";
import { revalidateSite } from "@/lib/revalidate-site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Preview only: replace THIS deploy's items and blog posts with a copy of the live ones.
// Reads the database named in MONGODB_URI (live), writes only into LYKA_DB_NAME (this preview's own database).
// Refuses on production, without LYKA_DB_NAME, when LYKA_DB_NAME is the live database, or when this deploy
// uses the live Cloudinary folder. Copied items keep their live image URLs; the preview can't delete those
// files because they're outside its Cloudinary folder (lib/cloudinary-root.ts).
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return run(async () => {
    const refusal = copyLiveSettingsRefusal();
    if (refusal) return NextResponse.json({ error: refusal }, { status: 403 });
    const status = await copyLiveStatus();
    if (!status.enabled) {
      return NextResponse.json({ error: status.reason ?? "Not available here." }, { status: 403 });
    }

    const { db: live } = await connectToUriDatabase();
    const { db: preview } = await connectToDatabase();
    if (live.databaseName === preview.databaseName) {
      return NextResponse.json({ error: "Refused: this deploy points at the live database." }, { status: 403 });
    }

    const counts: Record<string, number> = {};
    for (const name of [PORTFOLIO_COLLECTION, BLOG_COLLECTION]) {
      const docs = await live.collection<Document>(name).find({}).toArray();
      await preview.collection<Document>(name).deleteMany({});
      if (docs.length) await preview.collection<Document>(name).insertMany(docs, { ordered: false });
      counts[name] = docs.length;
    }
    await ensureBlogIndexes(preview);

    // Carry over whether the live blog has been moved out of the old Cloudinary store. If it hasn't, the
    // preview's admin does that move into the preview database when it opens (reading the old files only).
    const marker = await live.collection<{ _id: string }>(SITE_META_COLLECTION).findOne({ _id: BLOG_MIGRATION_ID });
    const previewMeta = preview.collection<{ _id: string }>(SITE_META_COLLECTION);
    await previewMeta.deleteOne({ _id: BLOG_MIGRATION_ID });
    if (marker) await previewMeta.insertOne(marker);

    revalidateSite("all");
    return NextResponse.json({
      ok: true,
      items: counts[PORTFOLIO_COLLECTION],
      posts: counts[BLOG_COLLECTION],
      from: live.databaseName,
      into: preview.databaseName
    });
  });
}
