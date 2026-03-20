import crypto from "crypto";
import { slugify } from "@/lib/slug";

type UploadResult = {
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
};

type UploadFolderContext = {
  categorySlug?: string | null;
  productTitle?: string | null;
};

const CLOUDINARY_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"];

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary env vars are missing.");
  }

  return { cloudName, apiKey, apiSecret };
}

function signUploadParams(params: Record<string, string | number>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${payload}${apiSecret}`)
    .digest("hex");
}

function stripCloudinaryFileExtension(value: string): string {
  const lowerValue = value.toLowerCase();
  const extension = CLOUDINARY_IMAGE_EXTENSIONS.find((item) => lowerValue.endsWith(item));
  return extension ? value.slice(0, -extension.length) : value;
}

export function extractCloudinaryPublicIdFromUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    if (!parsedUrl.hostname.endsWith("cloudinary.com")) {
      return null;
    }

    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    const uploadIndex = segments.findIndex((segment) => segment === "upload");

    if (uploadIndex === -1 || uploadIndex === segments.length - 1) {
      return null;
    }

    let relevantSegments = segments.slice(uploadIndex + 1);
    const versionIndex = relevantSegments.findIndex((segment) => /^v\d+$/.test(segment));

    if (versionIndex >= 0) {
      relevantSegments = relevantSegments.slice(versionIndex + 1);
    }

    if (relevantSegments.length === 0) {
      return null;
    }

    const [lastSegment, ...rest] = [...relevantSegments].reverse();
    const normalizedLastSegment = stripCloudinaryFileExtension(lastSegment);

    return [...rest.reverse(), normalizedLastSegment].join("/") || null;
  } catch {
    return null;
  }
}

export function resolveCloudinaryPublicId(params: {
  publicId?: string | null;
  url?: string | null;
}): string | null {
  const explicitPublicId = params.publicId?.trim();
  if (explicitPublicId) {
    return explicitPublicId;
  }

  const url = params.url?.trim();
  if (!url) {
    return null;
  }

  return extractCloudinaryPublicIdFromUrl(url);
}

function buildCloudinaryFolder(context: UploadFolderContext = {}): string {
  const categorySegment = slugify(context.categorySlug ?? "") || "uncategorized";
  const productSegment = slugify(context.productTitle ?? "") || "imagen";

  return `sine/products/${categorySegment}/${productSegment}`;
}

export async function uploadImageToCloudinary(
  file: File,
  context: UploadFolderContext = {}
): Promise<UploadResult> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = buildCloudinaryFolder(context);

  const paramsToSign = {
    folder,
    timestamp
  };

  const signature = signUploadParams(paramsToSign, apiSecret);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        secure_url?: string;
        public_id?: string;
        width?: number;
        height?: number;
        error?: { message?: string };
      }
    | null;

  if (!response.ok || !payload?.secure_url || !payload?.public_id) {
    throw new Error(payload?.error?.message ?? "Cloudinary upload failed.");
  }

  return {
    url: payload.secure_url,
    publicId: payload.public_id,
    width: typeof payload.width === "number" ? payload.width : null,
    height: typeof payload.height === "number" ? payload.height : null
  };
}

export async function deleteImageFromCloudinary(publicId: string): Promise<void> {
  const normalizedPublicId = publicId.trim();
  if (!normalizedPublicId) {
    return;
  }

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const invalidate = "true";

  const signature = signUploadParams(
    {
      invalidate,
      public_id: normalizedPublicId,
      timestamp
    },
    apiSecret
  );

  const formData = new FormData();
  formData.append("public_id", normalizedPublicId);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("invalidate", invalidate);
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body: formData
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        result?: string;
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Cloudinary delete failed.");
  }

  if (payload?.result && !["ok", "not found"].includes(payload.result.toLowerCase())) {
    throw new Error(`Cloudinary delete failed: ${payload.result}`);
  }
}
