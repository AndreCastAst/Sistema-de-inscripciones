import { PrismaClient } from "@prisma/client";
import { generarBoletaPDF } from "./pdf";
import { enviarConfirmacionInscripcion } from "./email";

const prisma = new PrismaClient();

const MONTO_INSCRIPCION = 3;

/**
 * Datos de la boleta según cómo se pagó. `voucherUrl` guarda la referencia:
 *   SIM-{banco}-{numOp}-{codigo}  pago en ventanilla o voucher simulado
 *   mp:{paymentId}               cobro real por MercadoPago
 *   https://...                  voucher bancario subido por el postulante
 */
function datosBoleta(voucherUrl: string | null) {
  if (!voucherUrl) return null;

  if (voucherUrl.startsWith("mp:")) {
    const paymentId = voucherUrl.slice(3);
    return { banco: "MercadoPago", numOp: paymentId, codigoVoucher: paymentId };
  }

  if (voucherUrl.startsWith("SIM-")) {
    const parts = voucherUrl.split("-");
    if (parts.length < 4) return null;
    return {
      banco: parts[1],
      numOp: `${parts[1]}-${parts[2]}`,
      codigoVoucher: parts[3],
    };
  }

  // Voucher bancario adjunto: no hay número de operación que imprimir.
  return null;
}

/**
 * Envía al postulante la confirmación de su solicitud con la boleta adjunta.
 *
 * Se llama cuando el pago está confirmado, no al crear el expediente: con
 * MercadoPago la solicitud nace sin pago y el cobro ocurre después, así que
 * avisar antes le anunciaría al postulante un pago que todavía no existe.
 *
 * Es idempotente en la práctica porque solo se dispara desde los puntos que
 * confirman el pago, y esos ya verifican que no estuviera confirmado antes.
 */
export async function enviarConfirmacionDePago(postulacionId: number): Promise<void> {
  const p = await prisma.postulacion.findUnique({ where: { id: postulacionId } });
  if (!p) return;

  let pdfBuffer: Buffer | undefined;
  const datos = datosBoleta(p.voucherUrl);
  if (datos) {
    pdfBuffer = await generarBoletaPDF({
      nombreCompleto: `${p.apellidoPaterno} ${p.apellidoMaterno}, ${p.nombres}`,
      dni: p.dni,
      monto: MONTO_INSCRIPCION,
      banco: datos.banco,
      numOp: datos.numOp,
      codigoVoucher: datos.codigoVoucher,
      numeroBoleta: String(Math.floor(1000000 + Math.random() * 9000000)).padStart(8, "0"),
      fecha: new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }),
      hora: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
    });
  }

  await enviarConfirmacionInscripcion(p.gmail, {
    postulacionId: p.id,
    nombres: p.nombres,
    apellidoPaterno: p.apellidoPaterno,
    apellidoMaterno: p.apellidoMaterno,
    dni: p.dni,
    voucherUrl: p.voucherUrl ?? undefined,
    pdfBuffer,
  });
}
