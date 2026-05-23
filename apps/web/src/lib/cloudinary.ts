const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = "colegio-mvp";

async function subir(file: File, tipo: "image" | "raw"): Promise<string> {
  if (!CLOUD_NAME) throw new Error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME no configurado");

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${tipo}/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) throw new Error("Error al subir archivo a Cloudinary");

  const json = await res.json();
  return json.secure_url as string;
}

export function subirImagen(file: File): Promise<string> {
  return subir(file, "image");
}

export function subirPDF(file: File): Promise<string> {
  return subir(file, "raw");
}
