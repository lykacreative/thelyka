import { v2 as cloudinary } from "cloudinary";

let configured = false;

function ensureConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    configured = true;
  }

  return cloudinary;
}

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function createCloudinaryUploadSignature(
  params: Record<string, string | number>
) {
  const client = ensureConfigured();

  return client.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET!
  );
}

/* =========================================================
   CLOUDINARY RAW READ HELPER
   ========================================================= */

async function fetchCloudinaryRaw(
  publicId: string
): Promise<string | null> {
  const client = ensureConfigured();

  try {
    // Ask Admin API for the latest version.
    let version: number | undefined;

    try {
      const resource = await client.api.resource(publicId, {
        resource_type: "raw",
      });

      version = resource.version;
    } catch {
      // Resource doesn't exist.
      return null;
    }

    // Build a versioned URL so we always get the newest file.
    const url =
      client.url(publicId, {
        resource_type: "raw",
        secure: true,
        version,
      }) + `?t=${Date.now()}`;

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `Failed to read Cloudinary raw file (${response.status}).`
      );
    }

    return await response.text();
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.name === "TimeoutError" ||
        error.message.includes("fetch failed")
      )
    ) {
      console.warn(
        `[cloudinary] read timed out for "${publicId}"`
      );

      return null;
    }

    throw error;
  }
}

/* =========================================================
   IMAGE UPLOADS AND DELETES (admin)
   Uploads go straight from the browser to Cloudinary with a
   signature from /api/admin/upload-signature. Deletes go only
   through lib/cloudinary-delete.ts, which checks the root folder.
   ========================================================= */

export function cloudinaryUploadIdentity() {
  ensureConfigured();
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
  };
}

export function cloudinaryCloudName() {
  return process.env.CLOUDINARY_CLOUD_NAME ?? "";
}

// Returns Cloudinary's own answer: "ok" (deleted) or "not found" (already gone).
export async function destroyCloudinaryImage(
  publicId: string
): Promise<string> {
  const client = ensureConfigured();

  const result = (await client.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  })) as { result?: string };

  return result?.result ?? "unknown";
}

/* =========================================================
   RAW FILES (read only)
   The old blog store kept Markdown + a metadata JSON as raw
   files under thelyka/blogs/. lib/blog-legacy.ts reads them
   until the posts are moved into MongoDB.
   ========================================================= */

export async function readCloudinaryRaw(
  publicId: string
): Promise<string | null> {
  return fetchCloudinaryRaw(publicId);
}

// Like readCloudinaryRaw, but only "not found" returns null: timeouts and other
// errors throw, so a hiccup is never mistaken for "there are no posts".
export async function readCloudinaryRawStrict(
  publicId: string
): Promise<string | null> {
  const client = ensureConfigured();

  let version: number | undefined;

  try {
    const resource = await client.api.resource(publicId, {
      resource_type: "raw",
    });

    version = resource.version;
  } catch (error) {
    const status =
      (error as { error?: { http_code?: number } })?.error?.http_code ??
      (error as { http_code?: number })?.http_code;

    if (status === 404) {
      return null;
    }

    throw error;
  }

  const url =
    client.url(publicId, {
      resource_type: "raw",
      secure: true,
      version,
    }) + `?t=${Date.now()}`;

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to read Cloudinary raw file ${publicId} (${response.status}).`
    );
  }

  return response.text();
}
