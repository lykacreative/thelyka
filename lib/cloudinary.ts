import { v2 as cloudinary } from "cloudinary";

export const CLOUDINARY_METADATA_PUBLIC_ID =
  "thelyka/portfolio/metadata";

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

export function isCloudinarySrc(src: string) {
  return src.includes("res.cloudinary.com");
}

export function portfolioUsesCloudinary() {
  return isCloudinaryConfigured();
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
   PORTFOLIO METADATA
   ========================================================= */

export async function readCloudinaryMetadataRaw(): Promise<
  string | null
> {
  return fetchCloudinaryRaw(
    CLOUDINARY_METADATA_PUBLIC_ID
  );
}

export async function getRawResourceVersion(
  publicId: string
): Promise<number | null> {
  const client = ensureConfigured();

  try {
    const result = await client.api.resource(publicId, {
      resource_type: "raw",
    });

    return typeof result.version === "number"
      ? result.version
      : null;
  } catch {
    return null;
  }
}

export async function writeCloudinaryMetadataRaw(
  json: string
): Promise<void> {
  const client = ensureConfigured();

  await new Promise<void>((resolve, reject) => {
    const upload = client.uploader.upload_stream(
      {
        resource_type: "raw",
        public_id: CLOUDINARY_METADATA_PUBLIC_ID,
        overwrite: true,
        invalidate: true,
      },
      (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      }
    );

    upload.end(Buffer.from(json, "utf8"));
  });
}

/* =========================================================
   PORTFOLIO IMAGES
   ========================================================= */

export async function deleteCloudinaryImage(
  publicId: string
): Promise<void> {
  const client = ensureConfigured();

  await client.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
}

/* =========================================================
   BLOG IMAGES
   ========================================================= */

export async function uploadBlogImage(
  buffer: Buffer,
  year: string,
  filename: string
): Promise<{
  secureUrl: string;
  publicId: string;
}> {
  const client = ensureConfigured();

  const cleanFilename = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-");

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
  }>((resolve, reject) => {
    const upload = client.uploader.upload_stream(
      {
        folder: `thelyka/blog-media/${year}`,
        public_id: cleanFilename,
        overwrite: true,
        invalidate: true,
        resource_type: "image",
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(
            error ??
              new Error(
                "Cloudinary blog image upload failed."
              )
          );

          return;
        }

        resolve(uploadResult);
      }
    );

    upload.end(buffer);
  });

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
  };
}

 
export async function getBlogImagesFromCloudinary(): Promise<
  {
    src: string;
    year: string;
    filename: string;
    publicId: string;
  }[]
> {
  const client = ensureConfigured();

  const resources: Array<{
    secure_url?: string;
    public_id?: string;
  }> = [];

  let nextCursor: string | undefined;

  do {
    const options: Record<string, unknown> = {
      type: "upload",
      resource_type: "image",
      prefix: "thelyka/blog-media/",
      max_results: 500,
    };

    if (nextCursor) {
      options.next_cursor = nextCursor;
    }

    const result = await client.api.resources(options);

    resources.push(...(result.resources ?? []));

    nextCursor = result.next_cursor;
  } while (nextCursor);

  return resources
    .filter(
      (resource) =>
        typeof resource.secure_url === "string" &&
        typeof resource.public_id === "string"
    )
    .map((resource) => {
      const publicId = resource.public_id!;
      const src = resource.secure_url!;

      const parts = publicId.split("/");

      const filename =
        parts[parts.length - 1] || publicId;

      const year =
        parts.length >= 3 &&
        /^\d{4}$/.test(parts[2])
          ? parts[2]
          : "";

      return {
        src,
        year,
        filename,
        publicId,
      };
    })
    .sort((a, b) =>
      b.src.localeCompare(a.src)
    );
}


/* =========================================================
   GENERIC RAW FILES
   Used for blog Markdown + blog metadata
   ========================================================= */

export async function uploadCloudinaryRaw(
  content: string,
  publicId: string
): Promise<string> {
  const client = ensureConfigured();

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
  }>((resolve, reject) => {
    const upload = client.uploader.upload_stream(
      {
        resource_type: "raw",
        public_id: publicId,
        overwrite: true,
        invalidate: true,
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(
            error ??
              new Error(
                "Cloudinary raw upload failed."
              )
          );

          return;
        }

        resolve(uploadResult);
      }
    );

    upload.end(Buffer.from(content, "utf8"));
  });

  return result.secure_url;
}

export async function readCloudinaryRaw(
  publicId: string
): Promise<string | null> {
  return fetchCloudinaryRaw(publicId);
}

export async function deleteCloudinaryRaw(
  publicId: string
): Promise<void> {
  const client = ensureConfigured();

  await client.uploader.destroy(publicId, {
    resource_type: "raw",
    invalidate: true,
  });
}