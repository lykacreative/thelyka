import type { Db } from "mongodb";
import { destroyCloudinaryImage, isCloudinaryConfigured } from "@/lib/cloudinary";
import { checkCloudinaryDelete } from "@/lib/cloudinary-root";
import { PORTFOLIO_COLLECTION } from "@/lib/portfolio-collection";
import { BLOG_COLLECTION } from "@/lib/blog-store";

export type DeleteReport = {
  deleted: string[];
  alreadyGone: string[];
  kept: { publicId: string; reason: string }[];
  failed: { publicId: string; reason: string }[];
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Is this file still shown anywhere (another item's gallery or cover, a blog post's text or cover)?
async function stillUsed(db: Db, publicId: string) {
  const inUrl = new RegExp(`/${escapeRegex(publicId)}\\.[A-Za-z0-9]{2,5}(?:[?#)"'\\s]|$)`);
  const item = await db.collection(PORTFOLIO_COLLECTION).findOne(
    {
      $or: [
        { cloudinaryPublicId: publicId },
        { "gallery.cloudinaryPublicId": publicId },
        { src: { $regex: inUrl } },
        { "gallery.src": { $regex: inUrl } }
      ]
    },
    { projection: { title: 1 } }
  );
  if (item) return `still used by the item "${item.title ?? "Untitled"}"`;
  const post = await db
    .collection(BLOG_COLLECTION)
    .findOne({ $or: [{ content: { $regex: inUrl } }, { cover: { $regex: inUrl } }] }, { projection: { title: 1 } });
  if (post) return `still used by the post "${post.title ?? "Untitled"}"`;
  return null;
}

// The only way the admin deletes Cloudinary files. Call it AFTER the database change, so the record
// being changed no longer counts as a user of its own files. A file is deleted only when it is under
// LYKA_CLOUDINARY_ROOT (and never a live file from a preview) and nothing else still shows it.
export async function deleteCloudinaryFiles(db: Db, publicIds: Iterable<string>): Promise<DeleteReport> {
  const report: DeleteReport = { deleted: [], alreadyGone: [], kept: [], failed: [] };
  const unique = Array.from(new Set(Array.from(publicIds).filter((id) => typeof id === "string" && id.trim())));
  if (unique.length === 0) return report;

  if (!isCloudinaryConfigured()) {
    for (const publicId of unique) report.failed.push({ publicId, reason: "Cloudinary is not configured." });
    return report;
  }

  for (const publicId of unique) {
    const check = checkCloudinaryDelete(publicId, process.env);
    if (!check.ok) {
      report.kept.push({
        publicId,
        reason:
          check.reason === "outside-root"
            ? "outside this site's Cloudinary folder"
            : "a live file (previews never delete live files)"
      });
      continue;
    }
    const usedBy = await stillUsed(db, publicId);
    if (usedBy) {
      report.kept.push({ publicId, reason: usedBy });
      continue;
    }
    try {
      const result = await destroyCloudinaryImage(publicId);
      if (result === "ok") report.deleted.push(publicId);
      else if (result === "not found") report.alreadyGone.push(publicId);
      else report.failed.push({ publicId, reason: `Cloudinary said "${result}".` });
    } catch (error) {
      report.failed.push({ publicId, reason: error instanceof Error ? error.message : "Delete failed." });
    }
  }
  return report;
}
