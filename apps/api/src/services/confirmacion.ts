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
 * Descompone la referencia de un pago registrado en ventanilla o simulado.
 * Formato: SIM-{banco}-{numOp}-{codigo}; el cobro en efectivo llega como
 * SIM-EFECTIVO-VNT-{timestamp}.
 */
function datosBoletaSimulada(referencia: string | null) {
  if (!referencia?.startsWith("SIM-")) return null;
  const parts = referencia.split("-");
  if (parts.length < 4) return null;
  const esEfectivo = parts[1] === "EFECTIVO";
  return {
    banco: esEfectivo ? "Efectivo — Ventanilla CIP" : parts[1],
    numOp: esEfectivo ? `VNT-${parts[3]}` : `${parts[1]}-${parts[2]}`,
    codigoVoucher: parts[3],
  };
}

/**
 * Registra un pago cobrado en ventanilla (efectivo o voucher simulado).
 *
 * Igual que con MercadoPago, emite la boleta en PDF y la guarda en `voucherUrl`
 * para que cuente como Comprobante de Pago en la auditoría: antes ese campo
 * quedaba con el texto SIM-EFECTIVO-... y el revisor no tenía nada que abrir.
 */
export async function registrarPagoVentanilla(
  postulacionId: number,
  referencia: string
): Promise<void> {
  const p = await prisma.postulacion.findUnique({ where: { id: postulacionId } });
  if (!p) return;

  const datos = datosBoletaSimulada(referencia);
  const { fecha, hora } = fechaHora();
  let comprobanteUrl: string | null = null;
  let pdf: Buffer | undefined;

  if (datos) {
    try {
      pdf = await generarBoletaPDF({
        nombreCompleto: `${p.apellidoPaterno} ${p.apellidoMaterno}, ${p.nombres}`,
        dni: p.dni,
        monto: MONTO_INSCRIPCION,
        ...datos,
        numeroBoleta: numeroBoleta(),
        fecha,
        hora,
      });
      comprobanteUrl = await subirArchivo(pdf, "boletas", "image");
    } catch (err) {
      // El cobro ya ocurrió en caja: se conserva la referencia para no perderlo.
      console.error(`[Boleta] No se pudo emitir el comprobante de #${postulacionId}:`, err);
    }
  }

  await prisma.postulacion.update({
    where: { id: postulacionId },
    data: {
      voucherUrl: comprobanteUrl ?? referencia,
      referenciaPago: datos ? `${datos.banco} · Op. ${datos.numOp}` : referencia,
    },
  });

  await enviarConfirmacionInscripcion(p.gmail, {
    postulacionId: p.id,
    nombres: p.nombres,
    apellidoPaterno: p.apellidoPaterno,
    apellidoMaterno: p.apellidoMaterno,
    dni: p.dni,
    voucherUrl: comprobanteUrl ?? referencia,
    referenciaPago: datos ? `${datos.banco} · Op. ${datos.numOp}` : referencia,
    pagoConfirmado: true,
    pdfBuffer: pdf,
  }).catch((err) =>
    console.error(`[Email] Error al confirmar pago de #${postulacionId}:`, err?.message ?? err)
  );
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
      referenciaPago: `MercadoPago · Op. ${paymentId}`,
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

  await enviarConfirmacionInscripcion(p.gmail, {
    postulacionId: p.id,
    nombres: p.nombres,
    apellidoPaterno: p.apellidoPaterno,
    apellidoMaterno: p.apellidoMaterno,
    dni: p.dni,
    voucherUrl: p.voucherUrl ?? undefined,
    referenciaPago: p.referenciaPago ?? undefined,
    // Un voucher bancario suelto todavía lo tiene que verificar el revisor.
    pagoConfirmado: Boolean(p.mpPaymentId || p.referenciaPago),
  });
}
