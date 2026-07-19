import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middlewares/validate";
import { optionalAuth } from "../middlewares/auth";
import {
  crearPreferenciaInscripcion,
  crearPreferenciaMensualidad,
  obtenerPago,
} from "../services/mercadopago";

const router = Router();
const prisma = new PrismaClient();

// Un cajero solo puede operar colegiados de su propia sede. Sin token
// (consulta pública de carnet) o rol admin/super-admin: sin restricción.
function fueraDeSedeCajero(req: { usuario?: { rol: string; regionId: number | null } }, regionId: number): boolean {
  return req.usuario?.rol === "cajero" && req.usuario.regionId !== null && regionId !== req.usuario.regionId;
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

    // Traer todas las mensualidades (pagadas y pendientes)
    const ahora = new Date();
    const fechaAlta = new Date(colegiado.fechaAlta);
    const primerMes = new Date(fechaAlta.getFullYear(), fechaAlta.getMonth() + 1, 1);
    const mesActualInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const mensualidadesPagadas = await prisma.mensualidad.findMany({
      where: { colegiadoId: colegiado.id },
      select: { id: true, periodo: true, monto: true, pagadoEn: true },
    });

    const pagadasMap = new Map(mensualidadesPagadas.map((m) => [m.periodo, m]));

    const CUOTA_BASE = 1;
    const indiceActual = ahora.getFullYear() * 12 + ahora.getMonth();

    // Generar lista completa de meses desde el alta hasta hoy
    const mensualidades: Array<{
      id: number | null;
      periodo: string;
      monto: number;
      vencido: boolean;
      pagadoEn: string | null;
    }> = [];
    const cursor = new Date(primerMes);
    let idFicticio = -1;

    while (cursor <= mesActualInicio) {
      const periodo = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      // Vencido = mes anterior al actual (el mes actual se puede pagar sin mora).
      const vencido = cursor.getFullYear() * 12 + cursor.getMonth() < indiceActual;
      if (pagadasMap.has(periodo)) {
        const m = pagadasMap.get(periodo)!;
        mensualidades.push({
          id: m.id,
          periodo,
          monto: m.monto,
          vencido,
          pagadoEn: m.pagadoEn ? m.pagadoEn.toISOString() : null,
        });
      } else {
        mensualidades.push({ id: idFicticio--, periodo, monto: CUOTA_BASE, vencido, pagadoEn: null });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const pendientes = mensualidades.filter((m) => m.pagadoEn === null);
    // Mora: 1% por cada mes vencido sin pagar (excluye el mes actual), sobre la deuda vencida.
    const mesesVencidos = pendientes.filter((m) => m.vencido).length;
    const baseVencida = pendientes.filter((m) => m.vencido).reduce((sum, m) => sum + m.monto, 0);
    const moraPorcentaje = mesesVencidos; // 1% por mes vencido
    const totalMora = Math.round(baseVencida * (moraPorcentaje / 100) * 100) / 100;
    const totalBase = Math.round(pendientes.reduce((sum, m) => sum + m.monto, 0) * 100) / 100;
    const totalDeuda = Math.round((totalBase + totalMora) * 100) / 100;

    res.json({
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

// POST /api/v1/pagos/checkout — crear preferencia MercadoPago para inscripción (S/3)
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

// ─── PAGO DE MENSUALIDADES ────────────────────────────────────────────────────

// POST /api/v1/pagos/mensualidad/checkout — crear preferencia para mensualidad (S/1)
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
          monto: 1,
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
