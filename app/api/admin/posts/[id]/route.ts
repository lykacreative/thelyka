import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { idFilter, readJson, toAdminPost } from "@/lib/admin-data";
import { ConflictError, NotFoundError, run, summarize } from "@/lib/admin-route";
import { claimSlug, readPostInput } from "@/lib/admin-posts";
import { blogCollection, type BlogPostDoc } from "@/lib/blog-store";
import { imageUrlsInMarkdown, planSlugChange } from "@/lib/blog-slug";
import { cloudinaryCloudName } from "@/lib/cloudinary";
import { publicIdFromCloudinaryUrl } from "@/lib/cloudinary-root";
import { deleteCloudinaryFiles } from "@/lib/cloudinary-delete";
import { revalidateSite } from "@/lib/revalidate-site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

function stamp(value: unknown) {
  return value instanceof Date ? value.toISOString() : typeof value === "string" ? value : "";
}

// Save a post by its id: a new title, address or date updates this same post (never a copy).
// If the address changed, the old one is kept in oldSlugs and /blogs/<old> redirects permanently.
export async function PATCH(request: Request, context: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return run(async () => {
    const { id } = await context.params;
    const filter = idFilter<BlogPostDoc>(id);
    if (!filter) throw new NotFoundError("Post not found.");
    const body = await readJson(request);
    const input = readPostInput(body);

    const { db } = await connectToDatabase();
    const collection = blogCollection(db);
    const current = await collection.findOne(filter);
    if (!current) throw new NotFoundError("This post no longer exists (deleted elsewhere?). Reload the admin.");
    if (typeof body.expectedUpdatedAt === "string" && body.expectedUpdatedAt !== stamp(current.updatedAt)) {
      throw new ConflictError("This post was changed somewhere else since you opened it. Reload to see the latest, then edit again.");
    }

    const plan = planSlugChange(current, input.slug);
    if (plan.changed) await claimSlug(db, plan.slug, current._id ?? null);

    const saved = await collection.findOneAndUpdate(
      { _id: current._id },
      { $set: { ...input, slug: plan.slug, oldSlugs: plan.oldSlugs, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!saved) throw new NotFoundError("This post no longer exists.");

    revalidateSite("blogs");
    return NextResponse.json({ post: toAdminPost(saved), redirectedFrom: plan.changed ? current.slug : null });
  });
}

// Delete a post. With deleteImages, its images (in the text and the cover) are deleted from Cloudinary too,
// only files under this site's folder that nothing else shows.
export async function DELETE(request: Request, context: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return run(async () => {
    const { id } = await context.params;
    const filter = idFilter<BlogPostDoc>(id);
    if (!filter) throw new NotFoundError("Post not found.");
    const body = await readJson(request).catch(() => ({}) as Record<string, unknown>);

    const { db } = await connectToDatabase();
    const collection = blogCollection(db);
    const current = await collection.findOne(filter);
    if (!current) throw new NotFoundError("This post no longer exists.");
    await collection.deleteOne({ _id: current._id });

    let report = null;
    if (body.deleteImages === true) {
      const cloudName = cloudinaryCloudName();
      const urls = imageUrlsInMarkdown(current.content ?? "").concat(current.cover ? [current.cover] : []);
      const publicIds = urls
        .map((url) => publicIdFromCloudinaryUrl(url, cloudName))
        .filter((value): value is string => typeof value === "string");
      report = await deleteCloudinaryFiles(db, publicIds);
    }

    revalidateSite("blogs");
    return NextResponse.json({ ok: true, files: summarize(report) });
  });
}
