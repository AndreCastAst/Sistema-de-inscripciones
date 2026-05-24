export interface ResultadoValidacion {
  valido: boolean;
  error?: string;
}

// Carga lazy del módulo y los modelos
let faceapiModule: typeof import("face-api.js") | null = null;
let modelsLoaded = false;

async function getFaceApi() {
  if (!faceapiModule) {
    faceapiModule = await import("face-api.js");
  }
  return faceapiModule;
}

async function ensureModels(api: typeof import("face-api.js")) {
  if (modelsLoaded) return;
  await api.nets.tinyFaceDetector.loadFromUri("/models");
  modelsLoaded = true;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(); };
    img.src = url;
  });
}

// Muestrea los bordes de la imagen para verificar fondo claro
function checkLightBackground(img: HTMLImageElement): boolean {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 300 / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const w = canvas.width;
  const h = canvas.height;
  const samples: number[] = [];

  for (let x = 0; x < w; x += 3) {
    const t = ctx.getImageData(x, 0, 1, 1).data;
    const b = ctx.getImageData(x, h - 1, 1, 1).data;
    samples.push((t[0] + t[1] + t[2]) / 3);
    samples.push((b[0] + b[1] + b[2]) / 3);
  }
  for (let y = 0; y < h; y += 3) {
    const l = ctx.getImageData(0, y, 1, 1).data;
    const r = ctx.getImageData(w - 1, y, 1, 1).data;
    samples.push((l[0] + l[1] + l[2]) / 3);
    samples.push((r[0] + r[1] + r[2]) / 3);
  }

  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return avg > 185;
}

export async function validarFoto(file: File): Promise<ResultadoValidacion> {
  // 1. Formato
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["jpg", "jpeg", "png"].includes(ext)) {
    return { valido: false, error: "Solo se permiten archivos JPG, JPEG o PNG." };
  }
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    return { valido: false, error: "Formato de imagen no válido. Use JPG o PNG." };
  }

  // 2. Peso
  if (file.size > 2 * 1024 * 1024) {
    return { valido: false, error: "La imagen supera el límite de 2 MB." };
  }

  // 3. Cargar imagen
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return { valido: false, error: "No se pudo leer la imagen. Intente con otro archivo." };
  }

  // 4. Relación de aspecto 3:4 (0.75) o 4:5 (0.80), tolerancia ±8%
  const ratio = img.width / img.height;
  const valid34 = Math.abs(ratio - 0.75) <= 0.08;
  const valid45 = Math.abs(ratio - 0.80) <= 0.08;
  if (!valid34 && !valid45) {
    return {
      valido: false,
      error: `Relación de aspecto incorrecta (${img.width}×${img.height}). Use una foto con relación 3:4 o 4:5.`,
    };
  }

  // 5. Fondo claro
  if (!checkLightBackground(img)) {
    return {
      valido: false,
      error: "El fondo de la fotografía debe ser blanco o de color muy claro.",
    };
  }

  // 6. Detección facial
  try {
    const api = await getFaceApi();
    await ensureModels(api);

    const detections = await api.detectAllFaces(
      img,
      new api.TinyFaceDetectorOptions({ scoreThreshold: 0.45 })
    );

    if (detections.length === 0) {
      return {
        valido: false,
        error: "No se detectó ningún rostro en la imagen. Asegúrese de que el rostro esté visible, bien iluminado y de frente.",
      };
    }
    if (detections.length >= 2) {
      return {
        valido: false,
        error: `Se detectaron ${detections.length} rostros. La fotografía debe mostrar únicamente una persona.`,
      };
    }

    // 7. Centrado horizontal (±15% del ancho)
    const box = detections[0].box;
    const faceCenterX = box.x + box.width / 2;
    const imgCenterX = img.width / 2;
    const horizOffset = Math.abs(faceCenterX - imgCenterX) / img.width;

    if (horizOffset > 0.15) {
      return {
        valido: false,
        error: "El sujeto no está centrado horizontalmente. La línea vertical que divide el rostro debe coincidir con el centro de la imagen.",
      };
    }

    // 8. Posición vertical: el centro del rostro debe estar en el tercio superior
    const faceCenterY = box.y + box.height / 2;
    const vertPos = faceCenterY / img.height;
    if (vertPos < 0.10 || vertPos > 0.60) {
      return {
        valido: false,
        error: "Encuadre incorrecto. La cabeza y los hombros deben ocupar la parte central-superior de la imagen.",
      };
    }

    // 9. Equilibrio lateral: espacio izquierdo vs derecho del rostro
    const spaceLeft = box.x;
    const spaceRight = img.width - (box.x + box.width);
    const lateralBalance = Math.abs(spaceLeft - spaceRight) / img.width;
    if (lateralBalance > 0.18) {
      return {
        valido: false,
        error: "El sujeto no está equilibrado lateralmente. Debe haber espacio proporcional entre los hombros y los bordes laterales.",
      };
    }
  } catch {
    // Si la detección facial falla (sin red, etc.), se permite continuar
  }

  return { valido: true };
}
