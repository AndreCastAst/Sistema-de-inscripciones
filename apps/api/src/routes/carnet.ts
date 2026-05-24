import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

function calcularMorosidad(fechaAlta: Date, pagadas: Set<string>): { moroso: boolean; mesesPendientes: string[]; deudaTotal: number } {
  const ahora = new Date();
  // El primer mes de cobro es el mes siguiente al de alta
  const primerMes = new Date(fechaAlta.getFullYear(), fechaAlta.getMonth() + 1, 1);
  const mesActualInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const mesesPendientes: string[] = [];
  const cursor = new Date(primerMes);

  while (cursor <= mesActualInicio) {
    const periodo = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    if (!pagadas.has(periodo)) {
      mesesPendientes.push(periodo);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return {
    moroso: mesesPendientes.length > 0,
    mesesPendientes,
    deudaTotal: mesesPendientes.length * 20,
  };
}

// GET /api/v1/carnet/:codigo — datos del carnet (público)
router.get("/:codigo", async (req, res, next) => {
  try {
    const colegiado = await prisma.colegiado.findUniqueOrThrow({
      where: { codigo: req.params.codigo },
      include: { region: true, carrera: true },
    });

    const mensualidades = await prisma.mensualidad.findMany({
      where: { colegiadoId: colegiado.id, pagadoEn: { not: null } },
      select: { periodo: true },
    });

    const pagadas = new Set(mensualidades.map((m) => m.periodo));
    const { moroso, mesesPendientes, deudaTotal } = calcularMorosidad(colegiado.fechaAlta, pagadas);

    res.json({
      codigo: colegiado.codigo,
      nombres: colegiado.nombres,
      apellidoPaterno: colegiado.apellidoPaterno,
      apellidoMaterno: colegiado.apellidoMaterno,
      region: colegiado.region.nombre,
      carrera: colegiado.carrera.nombre,
      fotoUrl: colegiado.fotoUrl,
      fechaAlta: colegiado.fechaAlta,
      moroso,
      mesesPendientes,
      deudaTotal,
    });
  } catch (err) {
    next(err);
  }
});

export { router as carnetRoutes };
