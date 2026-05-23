import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// POST /api/v1/pagos/voucher — carga manual de voucher
router.post("/voucher", async (req, res, next) => {
  try {
    const { postulacionId, voucherUrl } = req.body;
    const postulacion = await prisma.postulacion.update({
      where: { id: Number(postulacionId) },
      data: { voucherUrl },
    });
    res.json(postulacion);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/pagos/mensualidad — registrar pago de mensualidad
router.post("/mensualidad", async (req, res, next) => {
  try {
    const { colegiadoId, periodo } = req.body;
    const mensualidad = await prisma.mensualidad.update({
      where: { colegiadoId_periodo: { colegiadoId: Number(colegiadoId), periodo } },
      data: { pagadoEn: new Date() },
    });

    // Re-habilitar si estaba inhabilitado
    const pendientes = await prisma.mensualidad.count({
      where: { colegiadoId: Number(colegiadoId), pagadoEn: null },
    });
    if (pendientes === 0) {
      await prisma.colegiado.update({
        where: { id: Number(colegiadoId) },
        data: { habilitado: true },
      });
    }

    res.json(mensualidad);
  } catch (err) {
    next(err);
  }
});

export { router as pagosRoutes };
