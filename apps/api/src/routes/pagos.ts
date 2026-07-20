import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middlewares/validate";
import { optionalAuth } from "../middlewares/auth";
import {
  crearPreferenciaInscripcion,
  crearPreferenciaMensualidades,
  parseRefMensualidades,
  obtenerPago,
} from "../services/mercadopago";
import { enviarConfirmacionDePago } from "../services/confirmacion";
import {
  calcularEstadoCuenta,
  calcularMontoPeriodos,
  calcularMontoPorCantidad,
  CUOTA_BASE,
  MAX_MESES_ADELANTO,
} from "../services/cuenta";

const router = Router();
const prisma = new PrismaClient();

// Un cajero solo puede operar colegiados de su propia sede. Sin token
// (consulta pública de carnet) o rol admin/super-admin: sin restricción.
function fueraDeSedeCajero(req: { usuario?: { rol: string; regionId: number | null } }, regionId: number): boolean {
  return req.usuario?.rol === "cajero" && req.usuario.regionId !== null && regionId !== req.usuario.regionId;
}

/**
 * Marca periodos como pagados por MercadoPago. Idempotente: el webhook y la
 * confirmación al retornar pueden ejecutarla ambas para el mismo pago.
 */
async function registrarMensualidadesPagadas(
  colegiadoId: number,
  periodos: string[],
  paymentId: string
): Promise<void> {
  for (const periodo of periodos) {
    await prisma.mensualidad.upsert({
      where: { colegiadoId_periodo: { colegiadoId, periodo } },
      update: { pagadoEn: new Date(), metodoPago: "MERCADOPAGO", mpPaymentId: paymentId },
      create: {
        colegiadoId,
        periodo,
        monto: CUOTA_BASE,
        pagadoEn: new Date(),
        metodoPago: "MERCADOPAGO",
        mpPaymentId: paymentId,
      },
    });
  }

  await prisma.auditoria.create({
    data: {
      accion: "PAGO_MENSUALIDAD_MP",
      entidad: "Colegiado",
      entidadId: colegiadoId,
      detalle: `Periodos: ${periodos.join(", ")} | PaymentId: ${paymentId}`,
    },
  });
}

// ─── CONSULTA DE ESTADO DE CUENTA ────────────────────────────────────────────

// GET /api/v1/pagos/:query — estado de cuenta; acepta DNI (8 dígitos) o código CIP
router.get("/:query", optionalAuth, async (req, res, next) => {
  try {
    const q = req.params.query;
    const where = /^\d{8}$/.test(q) ? { dni: q } : { codigo: q };

    const colegiado = await prisma.colegiado.findUniqueOrThrow({
      where,
      include: { carrera: true },
    });

    if (fueraDeSedeCajero(req, colegiado.regionId)) {
      return res.status(403).json({ error: "Este colegiado pertenece a otra sede" });
    }

    const { mensualidades, adelantables, totalDeuda, totalMora, moraPorcentaje } =
      await calcularEstadoCuenta(colegiado.id, new Date(colegiado.fechaAlta));

    res.json({
      adelantables,
      maxMesesAdelanto: MAX_MESES_ADELANTO,
      colegiado: {
        nombres: colegiado.nombres,
        apellidoPaterno: colegiado.apellidoPaterno,
        apellidoMaterno: colegiado.apellidoMaterno,
        codigo: colegiado.codigo,
        gmail: colegiado.gmail,
        carrera: { nombre: colegiado.carrera.nombre },
      },
      mensualidades,
      totalDeuda,
      totalMora,
      moraPorcentaje,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PAGO DE INSCRIPCIÓN ───────────────────────────────────────────────────────

const checkoutSchema = z.object({
  postulacionId: z.number().int().positive(),
});

// POST /api/v1/pagos/checkout — crear preferencia MercadoPago para inscripción (S/3)
router.post("/checkout", validate(checkoutSchema), async (req, res, next) => {
  try {
    const { postulacionId } = req.body;
    const postulacion = await prisma.postulacion.findUniqueOrThrow({
      where: { id: postulacionId },
    });

    // No volver a cobrar un expediente que ya tiene pago registrado.
    if (postulacion.voucherUrl) {
      return res.status(409).json({ error: "Esta solicitud ya tiene un pago registrado" });
    }

    const preferencia = await crearPreferenciaInscripcion(postulacion.id, {
      email: postulacion.gmail,
      nombres: postulacion.nombres,
      apellidos: `${postulacion.apellidoPaterno} ${postulacion.apellidoMaterno}`.trim(),
      dni: postulacion.dni,
    });
    res.json(preferencia);
  } catch (err) {
    next(err);
  }
});

const confirmarSchema = z.object({
  paymentId: z.string().min(1),
});

// POST /api/v1/pagos/inscripcion/:id/confirmar
//
// Al volver de la pasarela, MercadoPago incluye el payment_id en la URL. Se
// verifica ese pago contra la API de MercadoPago y, si está aprobado y
// corresponde a este expediente, se marca pagado sin esperar al webhook.
//
// El payment_id que llega por querystring NO se cree por sí solo: solo sirve
// para consultar el pago real; el estado y el expediente salen de la respuesta
// de MercadoPago, no del navegador.
router.post("/inscripcion/:id/confirmar", validate(confirmarSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { paymentId } = req.body;

    const postulacion = await prisma.postulacion.findUniqueOrThrow({ where: { id } });
    if (postulacion.voucherUrl) {
      return res.json({ pagado: true, referencia: postulacion.voucherUrl });
    }

    const pago = await obtenerPago(paymentId);
    if (!pago || pago.status !== "approved") {
      return res.json({ pagado: false, estado: pago?.status ?? "desconocido" });
    }

    // El pago debe corresponder a ESTE expediente, si no cualquiera podría
    // acreditar su solicitud con el id de un pago ajeno.
    if (pago.external_reference !== `inscripcion-${id}`) {
      return res.status(400).json({ error: "El pago no corresponde a esta solicitud" });
    }

    await prisma.postulacion.update({
      where: { id },
      data: { voucherUrl: `mp:${paymentId}` },
    });

    await prisma.auditoria.create({
      data: {
        accion: "PAGO_INSCRIPCION_MP",
        entidad: "Postulacion",
        entidadId: id,
        detalle: `PaymentId: ${paymentId} | Confirmado al retornar`,
      },
    });

    // El expediente ya tenía voucherUrl null al entrar (se verifica arriba), así
    // que este es el único punto que confirma el pago: el correo sale una vez.
    await enviarConfirmacionDePago(id).catch(console.error);

    res.json({ pagado: true, referencia: `mp:${paymentId}` });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/pagos/inscripcion/:id/estado — la página de retorno consulta acá
// si el webhook ya confirmó el pago (puede tardar unos segundos en llegar).
router.get("/inscripcion/:id/estado", async (req, res, next) => {
  try {
    const postulacion = await prisma.postulacion.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      select: { id: true, voucherUrl: true, gmail: true, nombres: true, apellidoPaterno: true },
    });
    res.json({
      id: postulacion.id,
      pagado: Boolean(postulacion.voucherUrl),
      referencia: postulacion.voucherUrl,
      gmail: postulacion.gmail,
    });
  } catch (err) {
    next(err);
  }
});

const voucherSchema = z.object({
  postulacionId: z.number().int().positive(),
  voucherUrl: z.string().url(),
});

// POST /api/v1/pagos/voucher — registrar pago manual con voucher bancario
router.post("/voucher", validate(voucherSchema), async (req, res, next) => {
  try {
    const { postulacionId, voucherUrl } = req.body;
    const postulacion = await prisma.postulacion.update({
      where: { id: postulacionId },
      data: { voucherUrl },
    });

    await prisma.auditoria.create({
      data: {
        accion: "VOUCHER_INSCRIPCION",
        entidad: "Postulacion",
        entidadId: postulacionId,
        detalle: voucherUrl,
      },
    });

    res.json(postulacion);
  } catch (err) {
    next(err);
  }
});

// ─── PAGO DE MENSUALIDADES ────────────────────────────────────────────────────

// Se acepta una cantidad de cuotas (se toman las más antiguas primero) o la
// lista explícita de periodos, que debe ser un tramo contiguo desde la más
// antigua: dejar huecos haría que la deuda vieja siga acumulando interés.
const mensualidadCheckoutSchema = z
  .object({
    codigo: z.string().min(1),
    cantidad: z.number().int().positive().optional(),
    periodos: z.array(z.string().regex(/^\d{4}-\d{2}$/)).optional(),
  })
  .refine((d) => d.cantidad !== undefined || (d.periodos?.length ?? 0) > 0, {
    message: "Indica cuántas cuotas pagar",
  });

// POST /api/v1/pagos/mensualidad/checkout — una preferencia para todos los
// periodos elegidos, con la mora incluida.
router.post("/mensualidad/checkout", optionalAuth, validate(mensualidadCheckoutSchema), async (req, res, next) => {
  try {
    const { codigo, cantidad, periodos } = req.body;
    const colegiado = await prisma.colegiado.findUniqueOrThrow({ where: { codigo } });

    if (fueraDeSedeCajero(req, colegiado.regionId)) {
      return res.status(403).json({ error: "Este colegiado pertenece a otra sede" });
    }

    // El monto se calcula acá, nunca se recibe del cliente: si no, cualquiera
    // podría fijar el precio de su propia deuda.
    const estado = await calcularEstadoCuenta(colegiado.id, new Date(colegiado.fechaAlta));

    let cuotas, interes, total;
    if (cantidad !== undefined) {
      ({ cuotas, interes, total } = calcularMontoPorCantidad(estado, cantidad));
    } else {
      const r = calcularMontoPeriodos(estado, periodos);
      if (!r.contiguo) {
        return res.status(400).json({
          error: "Debes pagar las cuotas en orden, desde la más antigua y sin saltear meses",
        });
      }
      ({ cuotas, interes, total } = r);
    }

    if (cuotas.length === 0) {
      return res.status(400).json({ error: "Los periodos indicados ya están pagados o no existen" });
    }
    const mora = interes;

    // Al pagador se le muestran las cuotas a valor base y el interés en una
    // línea aparte: el monto por cuota lleva el interés incorporado y sumarlo
    // otra vez como ítem lo cobraría dos veces. El total se deriva de los
    // ítems para que coincida exactamente con lo que cobra MercadoPago.
    const interesCobrado = Math.round(interes * 100) / 100;
    const totalCobrado = Math.round((cuotas.length * CUOTA_BASE + interesCobrado) * 100) / 100;

    const preferencia = await crearPreferenciaMensualidades(
      colegiado.id,
      cuotas.map((c) => ({ periodo: c.periodo, monto: CUOTA_BASE })),
      interesCobrado,
      {
        email: colegiado.gmail,
        nombres: colegiado.nombres,
        apellidos: `${colegiado.apellidoPaterno} ${colegiado.apellidoMaterno}`.trim(),
        dni: colegiado.dni,
      }
    );

    res.json({
      ...preferencia,
      total: totalCobrado,
      mora: interesCobrado,
      periodos: cuotas.map((c) => c.periodo),
      adelantos: cuotas.filter((c) => c.antiguedad < 0).length,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/pagos/mensualidad/confirmar — confirma con el payment_id del
// retorno, sin depender de que el webhook haya llegado.
router.post("/mensualidad/confirmar", validate(z.object({ paymentId: z.string().min(1) })), async (req, res, next) => {
  try {
    const pago = await obtenerPago(req.body.paymentId);
    if (!pago || pago.status !== "approved") {
      return res.json({ pagado: false, estado: pago?.status ?? "desconocido" });
    }

    const ref = parseRefMensualidades(pago.external_reference ?? "");
    if (!ref) return res.status(400).json({ error: "El pago no corresponde a mensualidades" });

    await registrarMensualidadesPagadas(ref.colegiadoId, ref.periodos, req.body.paymentId);
    res.json({ pagado: true, periodos: ref.periodos });
  } catch (err) {
    next(err);
  }
});

const mensualidadVoucherSchema = z.object({
  codigo: z.string(),
  periodo: z.string().regex(/^\d{4}-\d{2}$/, "El periodo debe tener formato YYYY-MM"),
  voucherUrl: z.string().url(),
});

// POST /api/v1/pagos/mensualidad/voucher — pago de mensualidad con voucher
router.post("/mensualidad/voucher", validate(mensualidadVoucherSchema), async (req, res, next) => {
  try {
    const { codigo, periodo, voucherUrl } = req.body;
    const colegiado = await prisma.colegiado.findUniqueOrThrow({ where: { codigo } });

    const mensualidad = await prisma.mensualidad.upsert({
      where: { colegiadoId_periodo: { colegiadoId: colegiado.id, periodo } },
      update: { pagadoEn: new Date(), metodoPago: "VOUCHER", voucherUrl },
      create: {
        colegiadoId: colegiado.id,
        periodo,
        monto: 1,
        pagadoEn: new Date(),
        metodoPago: "VOUCHER",
        voucherUrl,
      },
    });

    await prisma.auditoria.create({
      data: {
        accion: "PAGO_MENSUALIDAD_VOUCHER",
        entidad: "Colegiado",
        entidadId: colegiado.id,
        detalle: `Periodo: ${periodo}`,
      },
    });

    res.json(mensualidad);
  } catch (err) {
    next(err);
  }
});

// ─── WEBHOOK MERCADOPAGO ──────────────────────────────────────────────────────

// POST /api/v1/pagos/notificacion — webhook de MercadoPago
//
// Siempre responde 200, incluso ante un error: si devolviera 5xx MercadoPago
// reintentaría la misma notificación en bucle. Los fallos se registran en log.
router.post("/notificacion", async (req, res) => {
  try {
    // MercadoPago notifica varios topics (payment, merchant_order, plan...).
    // Solo "payment" trae un id consultable con la API de pagos; el resto se
    // acepta y se descarta, o `obtenerPago` fallaría con un id que no le
    // corresponde.
    const tipo = req.body?.type ?? req.body?.topic;
    if (tipo !== "payment") return res.sendStatus(200);

    const paymentId = req.body?.data?.id?.toString();
    if (!paymentId) return res.sendStatus(200);

    const pago = await obtenerPago(paymentId);
    if (!pago || pago.status !== "approved") return res.sendStatus(200);

    const referencia = pago.external_reference ?? "";

    if (referencia.startsWith("inscripcion-")) {
      const postulacionId = Number(referencia.split("-")[1]);
      await prisma.postulacion.update({
        where: { id: postulacionId },
        data: { voucherUrl: `mp:${paymentId}` },
      });

      await prisma.auditoria.create({
        data: {
          accion: "PAGO_INSCRIPCION_MP",
          entidad: "Postulacion",
          entidadId: postulacionId,
          detalle: `PaymentId: ${paymentId} | Monto: ${pago.transaction_amount ?? "?"}`,
        },
      });

      // Recién ahora el postulante recibe la confirmación con su boleta.
      await enviarConfirmacionDePago(postulacionId).catch(console.error);
    } else if (referencia.startsWith("mensualidades|")) {
      const ref = parseRefMensualidades(referencia);
      if (ref) await registrarMensualidadesPagadas(ref.colegiadoId, ref.periodos, paymentId);
    } else if (referencia.startsWith("mensualidad-")) {
      // Formato anterior (una preferencia por periodo): mensualidad-{id}-{YYYY-MM}.
      // Se mantiene por si queda algún pago en vuelo creado antes del cambio.
      const partes = referencia.split("-");
      const colegiadoId = Number(partes[1]);
      const periodo = `${partes[2]}-${partes[3]}`;
      if (Number.isInteger(colegiadoId) && /^\d{4}-\d{2}$/.test(periodo)) {
        await registrarMensualidadesPagadas(colegiadoId, [periodo], paymentId);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("[MercadoPago] Error procesando notificación:", err);
    res.sendStatus(200);
  }
});

// ─── SIMULACIÓN DE PASARELA DE PAGOS ─────────────────────────────────────────

const simulacionSchema = z.object({
  banco: z.string(),
  numeroOperacion: z.string(),
  tipo: z.enum(["inscripcion", "mensualidades"]),
  postulacionId: z.number().int().positive().optional(),
  codigo: z.string().optional(),
  periodos: z.array(z.string()).optional(),
});

// POST /api/v1/pagos/simulacion — registra un pago simulado (demo / curso)
router.post("/simulacion", optionalAuth, validate(simulacionSchema), async (req, res, next) => {
  try {
    const { banco, numeroOperacion, tipo, postulacionId, codigo, periodos } = req.body;
    const refPago = `SIM-${banco}-${numeroOperacion}`;

    if (tipo === "inscripcion" && postulacionId) {
      await prisma.postulacion.update({
        where: { id: postulacionId },
        data: { voucherUrl: refPago },
      });
      await prisma.auditoria.create({
        data: {
          accion: "PAGO_INSCRIPCION_SIMULADO",
          entidad: "Postulacion",
          entidadId: postulacionId,
          detalle: `Banco: ${banco} | Op: ${numeroOperacion}`,
        },
      });
    } else if (tipo === "mensualidades" && codigo && periodos?.length) {
      const colegiado = await prisma.colegiado.findUniqueOrThrow({ where: { codigo } });

      if (fueraDeSedeCajero(req, colegiado.regionId)) {
        return res.status(403).json({ error: "Este colegiado pertenece a otra sede" });
      }

      for (const periodo of periodos) {
        await prisma.mensualidad.upsert({
          where: { colegiadoId_periodo: { colegiadoId: colegiado.id, periodo } },
          update: { pagadoEn: new Date(), metodoPago: "VOUCHER", voucherUrl: refPago },
          create: {
            colegiadoId: colegiado.id,
            periodo,
            monto: 1,
            pagadoEn: new Date(),
            metodoPago: "VOUCHER",
            voucherUrl: refPago,
          },
        });
      }
      await prisma.auditoria.create({
        data: {
          accion: "PAGO_MENSUALIDADES_SIMULADO",
          entidad: "Colegiado",
          entidadId: colegiado.id,
          detalle: `Banco: ${banco} | Op: ${numeroOperacion} | Periodos: ${periodos.join(", ")}`,
        },
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export { router as pagosRoutes };
