import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

function generarPeriodosDesde(fechaAlta: Date): string[] {
  const ahora = new Date();
  const primerMes = new Date(fechaAlta.getFullYear(), fechaAlta.getMonth() + 1, 1);
  const mesActualInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const periodos: string[] = [];
  const cursor = new Date(primerMes);

  while (cursor <= mesActualInicio) {
    periodos.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return periodos;
}

// GET /api/v1/colegiado/:codigo — portal del colegiado (estado + pagos)
router.get("/:codigo", async (req, res, next) => {
  try {
    const colegiado = await prisma.colegiado.findUniqueOrThrow({
      where: { codigo: req.params.codigo },
      include: {
        region: true,
        carrera: true,
        mensualidades: { orderBy: { periodo: "desc" } },
      },
    });

    const pagadasMap = new Map(
      colegiado.mensualidades
        .filter((m) => m.pagadoEn)
        .map((m) => [m.periodo, m])
    );

    const todosLosPeriodos = generarPeriodosDesde(colegiado.fechaAlta);

    const historialPagos = todosLosPeriodos.map((periodo) => {
      const pago = pagadasMap.get(periodo);
      return {
        periodo,
        pagado: !!pago,
        pagadoEn: pago?.pagadoEn ?? null,
        metodoPago: pago?.metodoPago ?? null,
        voucherUrl: pago?.voucherUrl ?? null,
        monto: 1,
      };
    });

    const mesesPendientes = historialPagos.filter((p) => !p.pagado).map((p) => p.periodo);

    res.json({
      id: colegiado.id,
      codigo: colegiado.codigo,
      dni: colegiado.dni,
      nombres: colegiado.nombres,
      apellidoPaterno: colegiado.apellidoPaterno,
      apellidoMaterno: colegiado.apellidoMaterno,
      gmail: colegiado.gmail,
      region: colegiado.region.nombre,
      carrera: colegiado.carrera.nombre,
      fotoUrl: colegiado.fotoUrl,
      fechaAlta: colegiado.fechaAlta,
      habilitado: mesesPendientes.length === 0,
      deudaTotal: mesesPendientes.length * 1,
      mesesPendientes,
      historialPagos,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/colegiado/dni/:dni — buscar colegiado por DNI
router.get("/dni/:dni", async (req, res, next) => {
  try {
    const colegiado = await prisma.colegiado.findUniqueOrThrow({
      where: { dni: req.params.dni },
      select: { codigo: true, nombres: true, apellidoPaterno: true },
    });
    res.json(colegiado);
  } catch (err) {
    next(err);
  }
});

export { router as colegiadoRoutes };
