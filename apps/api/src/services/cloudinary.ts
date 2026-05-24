import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Genera una URL firmada válida por 2 horas para un recurso privado de Cloudinary.
 */
export function firmarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.includes("res.cloudinary.com")) return url;

  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/").filter(Boolean);
    // parts: [cloud_name, resource_type, type, "v{version}", ...public_id]
    const resourceType = parts[1] as "image" | "video" | "raw";
    const type = parts[2] as "upload" | "private" | "authenticated";

    const versionIndex = parts.findIndex((p, i) => i >= 3 && /^v\d+$/.test(p));
    const publicIdStart = versionIndex !== -1 ? versionIndex + 1 : 3;
    const publicId = parts.slice(publicIdStart).join("/");

    const expiresAt = Math.round(Date.now() / 1000) + 7200; // 2 horas

    return cloudinary.url(publicId, {
      resource_type: resourceType,
      type,
      sign_url: true,
      expires_at: expiresAt,
      secure: true,
    });
  } catch {
    return url;
  }
}

export async function subirArchivo(
  buffer: Buffer,
  carpeta: string,
  tipo: "image" | "raw" = "image"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `colegio-mvp/${carpeta}`, resource_type: tipo },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("Upload fallido"));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
