import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import {
  idFilter,
  portfolioCollection,
  readBasics,
  readCategoryFields,
  readCoverIndex,
  readGallery,
  readJson,
  toAdminItem
} from "@/lib/admin-data";
import { ConflictError, NotFoundError, run, summarize } from "@/lib/admin-route";
import { deleteCloudinaryFiles } from "@/lib/cloudinary-delete";
import { coverFields, galleryOf, isFeaturedRank, nextFeaturedRank } from "@/lib/item-rules";
import { revalidateSite } from "@/lib/revalidate-site";
import type { PortfolioItemDoc } from "@/lib/portfolio-collection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

function stamp(value: unknown) {
  return value instanceof Date ? value.toISOString() : typeof value === "string" ? value : "";
}

// Save an item in place: fields, images (order, cover, added, removed) and featured on/off; or only hide / show it.
// Removed images are deleted from Cloudinary only when the admin asked for it (deleteRemoved) and the
// file is under this site's folder and not shown anywhere else.
export async function PATCH(request: Request, context: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return run(async () => {
    const { id } = await context.params;
    const filter = idFilter<PortfolioItemDoc>(id);
    if (!filter) throw new NotFoundError("Item not found.");
    const body = await readJson(request);

    const { db } = await connectToDatabase();
    const collection = portfolioCollection(db);
    const current = await collection.findOne(filter);
    if (!current) throw new NotFoundError("This item no longer exists (deleted elsewhere?). Reload the admin.");
    // Hide / show on its own (the editor's Hide button): the item stays in the admin, the database and
    // Cloudinary, and only leaves (or comes back to) the site. Unsaved edits in the editor are not touched.
    if (typeof body.hidden === "boolean" && !("title" in body)) {
      const saved = await collection.findOneAndUpdate(
        { _id: current._id },
        { $set: { hidden: body.hidden, updatedAt: new Date() } },
        { returnDocument: "after" }
      );
      if (!saved) throw new NotFoundError("This item no longer exists.");
      revalidateSite("portfolio");
      return NextResponse.json({ item: toAdminItem(saved), files: null });
    }

    if (typeof body.expectedUpdatedAt === "string" && body.expectedUpdatedAt !== stamp(current.updatedAt)) {
      throw new ConflictError("This item was changed somewhere else since you opened it. Reload to see the latest, then edit again.");
    }

    const basics = readBasics(body);
    const categoryFields = readCategoryFields(body);
    const previousGallery = galleryOf(current);
    const gallery = readGallery(body.gallery, previousGallery);
    const cover = coverFields(gallery, readCoverIndex(body, gallery));

    let featured = isFeaturedRank(current.featured) ? current.featured : null;
    if (body.featured === true && featured === null) {
      const ranks = await collection.find({ featured: { $gt: 0 } }, { projection: { featured: 1 } }).toArray();
      featured = nextFeaturedRank(ranks.map((doc) => doc.featured));
    } else if (body.featured === false) {
      featured = null;
    }

    const now = new Date();
    const update = {
      ...basics,
      ...categoryFields,
      ...cover,
      gallery,
      featured,
      updatedAt: now
    };
    const saved = await collection.findOneAndUpdate({ _id: current._id }, { $set: update }, { returnDocument: "after" });
    if (!saved) throw new NotFoundError("This item no longer exists.");

    const keptSources = new Set(gallery.map((image) => image.src));
    const removedIds = new Set(
      previousGallery
        .filter((image) => !keptSources.has(image.src) && image.cloudinaryPublicId)
        .map((image) => image.cloudinaryPublicId as string)
    );
    const requested = Array.isArray(body.deleteRemoved) ? body.deleteRemoved.filter((value) => typeof value === "string") : [];
    const toDelete = requested.filter((publicId) => removedIds.has(publicId));
    const report = toDelete.length ? await deleteCloudinaryFiles(db, toDelete) : null;

    revalidateSite("portfolio");
    return NextResponse.json({ item: toAdminItem(saved), files: summarize(report) });
  });
}

// Delete an item. With deleteFiles, every image of the item is deleted from Cloudinary too
// (only files under this site's folder that nothing else shows).
export async function DELETE(request: Request, context: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return run(async () => {
    const { id } = await context.params;
    const filter = idFilter<PortfolioItemDoc>(id);
    if (!filter) throw new NotFoundError("Item not found.");
    const body = await readJson(request).catch(() => ({}) as Record<string, unknown>);

    const { db } = await connectToDatabase();
    const collection = portfolioCollection(db);
    const current = await collection.findOne(filter);
    if (!current) throw new NotFoundError("This item no longer exists.");

    await collection.deleteOne({ _id: current._id });

    let report = null;
    if (body.deleteFiles === true) {
      const publicIds = galleryOf(current)
        .map((image) => image.cloudinaryPublicId)
        .concat(typeof current.cloudinaryPublicId === "string" ? [current.cloudinaryPublicId] : [])
        .filter((value): value is string => typeof value === "string" && value.length > 0);
      report = await deleteCloudinaryFiles(db, publicIds);
    }

    revalidateSite("portfolio");
    return NextResponse.json({ ok: true, files: summarize(report) });
  });
}
