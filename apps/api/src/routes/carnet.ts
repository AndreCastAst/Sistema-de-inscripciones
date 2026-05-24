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

// GET /api/v1/carnet/:query — datos del carnet; acepta DNI (8 dígitos) o código CIP
router.get("/:query", async (req, res, next) => {
  try {
    const q = req.params.query;

    // Buscar por DNI si son 8 dígitos numéricos, si no por código CIP
    const where = /^\d{8}$/.test(q) ? { dni: q } : { codigo: q };

    const colegiado = await prisma.colegiado.findUniqueOrThrow({
      where,
      include: { region: true, carrera: true },
    });

    const mensualidades = await prisma.mensualidad.findMany({
      where: { colegiadoId: colegiado.id, pagadoEn: { not: null } },
      select: { periodo: true },
    });

    const pagadas = new Set(mensualidades.map((m) => m.periodo));
    const { moroso, mesesPendientes, deudaTotal } = calcularMorosidad(colegiado.fechaAlta, pagadas);

    res.json({
      id: colegiado.id,
      codigo: colegiado.codigo,
      dni: colegiado.dni,
      nombres: colegiado.nombres,
      apellidoPaterno: colegiado.apellidoPaterno,
      apellidoMaterno: colegiado.apellidoMaterno,
      regionId: colegiado.regionId,
      carreraId: colegiado.carreraId,
      fotoUrl: colegiado.fotoUrl,
      fechaAlta: colegiado.fechaAlta,
      habilitado: !moroso,
      inhabilitado: moroso,
      region: colegiado.region,
      carrera: colegiado.carrera,
      mesesPendientes,
      deudaTotal,
    });
  } catch (err) {
    next(err);
  }
});

export { router as carnetRoutes };
