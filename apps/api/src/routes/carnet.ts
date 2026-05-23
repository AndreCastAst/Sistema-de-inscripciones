import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/carnet/:codigo
router.get("/:codigo", async (req, res, next) => {
  try {
    const colegiado = await prisma.colegiado.findUniqueOrThrow({
      where: { codigo: req.params.codigo },
      include: { region: true, carrera: true },
    });

    // Verificar deuda pendiente
    const deuda = await prisma.mensualidad.count({
      where: { colegiadoId: colegiado.id, pagadoEn: null },
    });

    res.json({ ...colegiado, inhabilitado: deuda > 0 });
  } catch (err) {
    next(err);
  }
});

export { router as carnetRoutes };
