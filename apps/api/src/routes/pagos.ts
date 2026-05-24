import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middlewares/validate";
import {
  crearPreferenciaInscripcion,
  crearPreferenciaMensualidad,
  obtenerPago,
} from "../services/mercadopago";

const router = Router();
const prisma = new PrismaClient();

// ─── PAGO DE INSCRIPCIÓN ───────────────────────────────────────────────────

// POST /api/v1/pagos/checkout — crear preferencia MercadoPago para inscripción (S/1,500)
router.post("/checkout", async (req, res, next) => {
  try {
    const { postulacionId } = req.body;
    const postulacion = await prisma.postulacion.findUniqueOrThrow({
      where: { id: Number(postulacionId) },
    });

    const preferencia = await crearPreferenciaInscripcion(postulacion.id, postulacion.gmail);
    res.json(preferencia);
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

// ─── PAGO DE MENSUALIDADES ────────────────────────────────────────────────

// POST /api/v1/pagos/mensualidad/checkout — crear preferencia para mensualidad (S/20)
router.post("/mensualidad/checkout", async (req, res, next) => {
  try {
    const { codigo, periodo } = req.body;
    const colegiado = await prisma.colegiado.findUniqueOrThrow({ where: { codigo } });

    const preferencia = await crearPreferenciaMensualidad(colegiado.id, periodo, colegiado.gmail);
    res.json(preferencia);
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
        monto: 20,
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

// ─── WEBHOOK MERCADOPAGO ──────────────────────────────────────────────────

// POST /api/v1/pagos/notificacion — webhook de MercadoPago
router.post("/notificacion", async (req, res, next) => {
  try {
    // MercadoPago envía el ID del pago en data.id
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
    } else if (referencia.startsWith("mensualidad-")) {
      // formato: mensualidad-{colegiadoId}-{YYYY-MM}
      const partes = referencia.split("-");
      const colegiadoId = Number(partes[1]);
      const periodo = `${partes[2]}-${partes[3]}`;

      await prisma.mensualidad.upsert({
        where: { colegiadoId_periodo: { colegiadoId, periodo } },
        update: { pagadoEn: new Date(), metodoPago: "MERCADOPAGO", mpPaymentId: paymentId },
        create: {
          colegiadoId,
          periodo,
          monto: 20,
          pagadoEn: new Date(),
          metodoPago: "MERCADOPAGO",
          mpPaymentId: paymentId,
        },
      });

      await prisma.auditoria.create({
        data: {
          accion: "PAGO_MENSUALIDAD_MP",
          entidad: "Colegiado",
          entidadId: colegiadoId,
          detalle: `Periodo: ${periodo}, PaymentId: ${paymentId}`,
        },
      });
    }

    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

export { router as pagosRoutes };
