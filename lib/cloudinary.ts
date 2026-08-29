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

export function isCloudinarySrc(src: string) {
  return src.includes("res.cloudinary.com");
}

export function portfolioUsesCloudinary() {
  return (
    isCloudinaryConfigured() &&
    process.env.NODE_ENV === "production"
  );
}

/* =========================================================
   PORTFOLIO METADATA
   ========================================================= */

export async function readCloudinaryMetadataRaw(): Promise<string | null> {
  const client = ensureConfigured();

  const url = client.url(CLOUDINARY_METADATA_PUBLIC_ID, {
    resource_type: "raw",
    secure: true,
  });

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to read Cloudinary metadata (${response.status}).`
    );
  }

  return response.text();
}

export async function writeCloudinaryMetadataRaw(
  json: string
) {
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

type UploadImageResult = {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
};

export async function uploadPortfolioImage(
  buffer: Buffer,
  folder: string,
  publicId: string
): Promise<UploadImageResult> {
  const client = ensureConfigured();

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    width?: number;
    height?: number;
  }>((resolve, reject) => {
    const upload = client.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite: false,
        resource_type: "image",
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(
            error ?? new Error("Cloudinary upload failed.")
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
    width: result.width ?? 1,
    height: result.height ?? 1,
  };
}

export async function deleteCloudinaryImage(
  publicId: string
) {
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
              new Error("Cloudinary blog image upload failed.")
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
              new Error("Cloudinary raw upload failed.")
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
  const client = ensureConfigured();

  const url = client.url(publicId, {
    resource_type: "raw",
    secure: true,
  });

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to read Cloudinary raw file (${response.status}).`
    );
  }

  return response.text();
}

export async function deleteCloudinaryRaw(
  publicId: string
) {
  const client = ensureConfigured();

  await client.uploader.destroy(publicId, {
    resource_type: "raw",
    invalidate: true,
  });
}