import { PrismaClient } from "@prisma/client";
import { generarBoletaPDF } from "./pdf";
import { subirArchivo } from "./cloudinary";
import { enviarConfirmacionInscripcion } from "./email";

const prisma = new PrismaClient();

const MONTO_INSCRIPCION = 3;

function numeroBoleta(): string {
  return String(Math.floor(1000000 + Math.random() * 9000000)).padStart(8, "0");
}

function fechaHora() {
  const ahora = new Date();
  return {
    fecha: ahora.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }),
    hora: ahora.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
  };
}

/**
 * Datos de la boleta para pagos registrados en ventanilla o simulados, cuya
 * referencia viene codificada en voucherUrl como SIM-{banco}-{numOp}-{codigo}.
 */
function datosBoletaSimulada(voucherUrl: string | null) {
  if (!voucherUrl?.startsWith("SIM-")) return null;
  const parts = voucherUrl.split("-");
  if (parts.length < 4) return null;
  return { banco: parts[1], numOp: `${parts[1]}-${parts[2]}`, codigoVoucher: parts[3] };
}

/**
 * Registra un pago de inscripción cobrado por MercadoPago.
 *
 * Genera la boleta en PDF, la sube y la guarda en `voucherUrl` para que el
 * revisor pueda abrirla desde la auditoría igual que un voucher bancario: antes
 * ese campo guardaba el texto "mp:{id}", que en el visor no mostraba nada.
 *
 * El PDF se sube como recurso `image` a propósito. Cloudinary bloquea la entrega
 * directa de PDFs (responde 401), pero sobre `/image/upload/` el visor puede
 * pedir la misma URL con extensión .jpg y renderizar la primera página, que es
 * lo que ya hace la pantalla de auditoría con los títulos.
 *
 * Idempotente: si el expediente ya tiene comprobante, no hace nada.
 */
export async function registrarPagoInscripcion(
  postulacionId: number,
  paymentId: string
): Promise<void> {
  const p = await prisma.postulacion.findUnique({ where: { id: postulacionId } });
  if (!p || p.voucherUrl) return;

  const { fecha, hora } = fechaHora();
  let comprobanteUrl: string | null = null;

  try {
    const pdf = await generarBoletaPDF({
      nombreCompleto: `${p.apellidoPaterno} ${p.apellidoMaterno}, ${p.nombres}`,
      dni: p.dni,
      monto: MONTO_INSCRIPCION,
      banco: "MercadoPago",
      numOp: paymentId,
      codigoVoucher: paymentId,
      numeroBoleta: numeroBoleta(),
      fecha,
      hora,
    });
    comprobanteUrl = await subirArchivo(pdf, "boletas", "image");
  } catch (err) {
    // Si falla la boleta el pago igual quedó hecho: se guarda la referencia
    // para no perderlo, y el revisor puede verificarlo por el id de operación.
    console.error(`[Boleta] No se pudo generar/subir el comprobante de #${postulacionId}:`, err);
  }

  await prisma.postulacion.update({
    where: { id: postulacionId },
    data: {
      voucherUrl: comprobanteUrl ?? `mp:${paymentId}`,
      mpPaymentId: paymentId,
    },
  });

  await enviarConfirmacionDePago(postulacionId).catch((err) =>
    console.error(`[Email] Error al confirmar pago de #${postulacionId}:`, err?.message ?? err)
  );
}

/**
 * Envía al postulante la confirmación de su solicitud con la boleta adjunta.
 *
 * Se llama cuando el pago está confirmado, no al crear el expediente: con
 * MercadoPago la solicitud nace sin pago y el cobro ocurre después, así que
 * avisar antes le anunciaría un pago que todavía no existe.
 */
export async function enviarConfirmacionDePago(postulacionId: number): Promise<void> {
  const p = await prisma.postulacion.findUnique({ where: { id: postulacionId } });
  if (!p) return;

  let pdfBuffer: Buffer | undefined;
  const sim = datosBoletaSimulada(p.voucherUrl);
  if (sim) {
    const { fecha, hora } = fechaHora();
    pdfBuffer = await generarBoletaPDF({
      nombreCompleto: `${p.apellidoPaterno} ${p.apellidoMaterno}, ${p.nombres}`,
      dni: p.dni,
      monto: MONTO_INSCRIPCION,
      ...sim,
      numeroBoleta: numeroBoleta(),
      fecha,
      hora,
    });
  }

  await enviarConfirmacionInscripcion(p.gmail, {
    postulacionId: p.id,
    nombres: p.nombres,
    apellidoPaterno: p.apellidoPaterno,
    apellidoMaterno: p.apellidoMaterno,
    dni: p.dni,
    voucherUrl: p.voucherUrl ?? undefined,
    mpPaymentId: p.mpPaymentId ?? undefined,
    pdfBuffer,
  });
}
