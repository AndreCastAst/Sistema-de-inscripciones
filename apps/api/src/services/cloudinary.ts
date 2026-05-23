import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
