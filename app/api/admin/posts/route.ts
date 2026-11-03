import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { loadAdminPosts, readJson, toAdminPost } from "@/lib/admin-data";
import { run } from "@/lib/admin-route";
import { claimSlug, readPostInput } from "@/lib/admin-posts";
import { blogCollection, ensureBlogsMigrated, type BlogPostDoc } from "@/lib/blog-store";
import { revalidateSite } from "@/lib/revalidate-site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every post, for the blog editor (copies the old Cloudinary posts in first, once).
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return run(async () => {
    const { db } = await connectToDatabase();
    const migration = await ensureBlogsMigrated(db);
    return NextResponse.json({ posts: await loadAdminPosts(db), migration }, { headers: { "Cache-Control": "no-store" } });
  });
}

// A new post. It is live as soon as it's saved.
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return run(async () => {
    const input = readPostInput(await readJson(request));
    const { db } = await connectToDatabase();
    await ensureBlogsMigrated(db);
    await claimSlug(db, input.slug, null);
    const now = new Date();
    const doc: BlogPostDoc = { ...input, oldSlugs: [], createdAt: now, updatedAt: now };
    const result = await blogCollection(db).insertOne(doc);
    revalidateSite("blogs");
    return NextResponse.json({ post: toAdminPost({ ...doc, _id: result.insertedId }) });
  });
}
