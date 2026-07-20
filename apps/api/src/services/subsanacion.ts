import { PrismaClient, Postulacion } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

export const CAMPOS_SUBSANABLES = ["foto", "titulo", "voucher"] as const;
export type CampoSubsanable = (typeof CAMPOS_SUBSANABLES)[number];

export const ETIQUETA_CAMPO: Record<string, string> = {
  foto: "fotografía",
  titulo: "título profesional",
  voucher: "comprobante de pago",
};

export interface DocumentosSubsanacion {
  fotoUrl?: string;
  tituloUrl?: string;
  voucherUrl?: string;
}

export interface OpcionesSubsanacion {
  /** Admin que cargó los documentos en sede. Ausente en el camino público. */
  actorId?: number | null;
  /** Texto libre para la auditoría. */
  detalle?: string;
}

/** Body compartido por las tres rutas que subsanan. */
export const subsanacionSchema = z
  .object({
    fotoUrl: z.string().url().optional(),
    tituloUrl: z.string().url().optional(),
    voucherUrl: z.string().url().optional(),
  })
  .refine((d) => d.fotoUrl || d.tituloUrl || d.voucherUrl, {
    message: "Debe enviar al menos un documento para subsanar",
  });

// El errorHandler traduce cualquier error con `.status` a JSON, así que el
// servicio lanza en vez de responder y las rutas solo hacen next(err).
function httpError(status: number, message: string): Error {
  return Object.assign(new Error(message), { status });
}

/**
 * Documentos que la última observación dejó corregibles.
 *
 * Las observaciones anteriores a esta función no tienen campos marcados; en ese
 * caso se permiten los tres, para no dejar sin salida a expedientes ya
 * notificados bajo las reglas viejas.
 */
export async function camposPermitidos(postulacionId: number): Promise<string[]> {
  const ultima = await prisma.observacion.findFirst({
    where: { postulacionId },
    orderBy: { creadoEn: "desc" },
  });
  return ultima?.campos.length ? ultima.campos : [...CAMPOS_SUBSANABLES];
}

/**
 * Reemplaza los documentos observados de un expediente y lo devuelve a revisión.
 *
 * Vive en un servicio y no en una ruta porque tres caminos la necesitan —el
 * enlace del correo, la búsqueda por DNI del portal y el módulo del admin— y la
 * restricción de campos es una regla de seguridad: si cada ruta la
 * reimplementara, podrían divergir y abrir un hueco.
 *
 * @throws 400 si el expediente no está OBSERVADO o si llega un documento que no
 *         fue observado. Un id inexistente sale como P2025 → 404.
 */
export async function aplicarSubsanacion(
  id: number,
  docs: DocumentosSubsanacion,
  opciones: OpcionesSubsanacion = {}
): Promise<Postulacion> {
  const actual = await prisma.postulacion.findUniqueOrThrow({ where: { id } });

  if (actual.estado !== "OBSERVADO") {
    throw httpError(400, "Solo se pueden subsanar postulaciones en estado OBSERVADO");
  }

  const permitidos = await camposPermitidos(id);

  const { fotoUrl, tituloUrl, voucherUrl } = docs;
  const enviados = [
    ...(fotoUrl ? ["foto"] : []),
    ...(tituloUrl ? ["titulo"] : []),
    ...(voucherUrl ? ["voucher"] : []),
  ];
  const noPermitidos = enviados.filter((c) => !permitidos.includes(c));
  if (noPermitidos.length) {
    throw httpError(
      400,
      `Solo puedes corregir los documentos observados. No corresponde modificar: ${noPermitidos
        .map((c) => ETIQUETA_CAMPO[c] ?? c)
        .join(", ")}.`
    );
  }

  // Actualización y auditoría en una transacción: un expediente marcado como
  // subsanado sin su registro de auditoría dejaría el cambio sin rastro.
  const [postulacion] = await prisma.$transaction([
    prisma.postulacion.update({
      where: { id },
      data: {
        ...(fotoUrl && { fotoUrl }),
        ...(tituloUrl && { tituloUrl }),
        ...(voucherUrl && { voucherUrl }),
        estado: "SUBSANADO",
        // El enlace del correo queda inutilizable: ya cumplió su propósito y no
        // debe permitir reemplazar documentos de un expediente ya reenviado.
        tokenSubsanacion: null,
      },
    }),
    prisma.auditoria.create({
      data: {
        accion: "SUBSANACION",
        entidad: "Postulacion",
        entidadId: id,
        actorId: opciones.actorId ?? null,
        detalle: opciones.detalle,
      },
    }),
  ]);

  return postulacion;
}
