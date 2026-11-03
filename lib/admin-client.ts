// Browser-side helpers for the admin: JSON calls to /api/admin/* and direct signed uploads to Cloudinary.

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal
    });
  } catch {
    throw new ApiError("No connection to the server. Check the internet and try again; nothing was lost here.", 0);
  }
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiError("You're signed out. Sign in again in a new tab (/admin/login), then come back and retry. Your edits here are kept.", 401);
    }
    throw new ApiError(payload.error ?? `The server answered ${response.status}.`, response.status);
  }
  return payload as T;
}

export type UploadTarget = { kind: "portfolio"; category: string; year: string } | { kind: "blog"; year: string };

export type UploadedImage = {
  src: string;
  cloudinaryPublicId: string;
  width?: number;
  height?: number;
  bytes?: number;
};

type Signature = {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  overwrite: string;
};

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|heic|heif|tiff?|bmp|svg)$/i;

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || (!file.type && IMAGE_EXTENSIONS.test(file.name));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// "Poster 010_Miyazaki-final.png" -> "Poster 010 Miyazaki final"
export function titleFromFileName(name: string) {
  return name.replace(/\.[^.]{1,8}$/, "").replace(/[_-]+/g, " ").replace(/\s{2,}/g, " ").trim() || "Untitled";
}

function cloudinaryMessage(status: number, message: string | undefined, file: File) {
  if (message && /file size too large/i.test(message)) {
    const limit = message.match(/maximum is (\d+)/i);
    return `Too big for the Cloudinary plan: ${formatBytes(file.size)}${limit ? ` (limit ${formatBytes(Number(limit[1]))})` : ""}. Not uploaded; nothing was compressed.`;
  }
  return message ? `Cloudinary: ${message}` : `Cloudinary answered ${status}.`;
}

// One file: the server signs it (folder + unique id + overwrite=false), the browser sends it straight to
// Cloudinary with progress. The file goes up as it is: no resizing, no re-encoding.
export async function uploadImage(
  file: File,
  target: UploadTarget,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal
): Promise<UploadedImage> {
  const signed = await api<Signature>("/api/admin/upload-signature", {
    method: "POST",
    body: { ...target, filename: file.name },
    signal
  });

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("signature", signed.signature);
  form.append("folder", signed.folder);
  form.append("public_id", signed.publicId);
  form.append("overwrite", signed.overwrite);

  return new Promise<UploadedImage>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", signed.uploadUrl);
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      const body = (xhr.response ?? {}) as {
        secure_url?: string;
        public_id?: string;
        width?: number;
        height?: number;
        bytes?: number;
        existing?: boolean;
        error?: { message?: string };
      };
      if (xhr.status < 200 || xhr.status >= 300 || !body.secure_url || !body.public_id) {
        reject(new Error(cloudinaryMessage(xhr.status, body.error?.message, file)));
        return;
      }
      if (body.existing) {
        reject(new Error("Cloudinary already had a file with this id, so nothing was uploaded. Try again."));
        return;
      }
      onProgress(1);
      resolve({
        src: body.secure_url,
        cloudinaryPublicId: body.public_id,
        width: body.width,
        height: body.height,
        bytes: body.bytes
      });
    };
    xhr.onerror = () => reject(new Error("The upload to Cloudinary failed (connection). Retry."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled.", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}

export function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
