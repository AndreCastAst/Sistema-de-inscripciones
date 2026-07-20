import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const CUOTA_BASE = 1;

export interface MensualidadCalculada {
  id: number | null;
  periodo: string;
  monto: number;
  vencido: boolean;
  pagadoEn: string | null;
}

export interface EstadoCuenta {
  mensualidades: MensualidadCalculada[];
  totalDeuda: number;
  totalMora: number;
  moraPorcentaje: number;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

/**
 * Calcula la deuda de un colegiado desde su fecha de alta hasta hoy.
 *
 * Vive acá y no en la ruta porque el estado de cuenta y el cobro por pasarela
 * tienen que dar exactamente el mismo número: antes la pantalla mostraba la
 * mora pero MercadoPago cobraba solo las cuotas, así que el colegiado pagaba
 * menos de lo que decía deber y la deuda nunca se saldaba.
 */
export async function calcularEstadoCuenta(
  colegiadoId: number,
  fechaAlta: Date
): Promise<EstadoCuenta> {
  const ahora = new Date();
  const primerMes = new Date(fechaAlta.getFullYear(), fechaAlta.getMonth() + 1, 1);
  const mesActualInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const pagadas = await prisma.mensualidad.findMany({
    where: { colegiadoId },
    select: { id: true, periodo: true, monto: true, pagadoEn: true },
  });
  const pagadasMap = new Map(pagadas.map((m) => [m.periodo, m]));

  const indiceActual = ahora.getFullYear() * 12 + ahora.getMonth();
  const mensualidades: MensualidadCalculada[] = [];
  const cursor = new Date(primerMes);
  let idFicticio = -1;

  while (cursor <= mesActualInicio) {
    const periodo = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    // Vencido = mes anterior al actual (el mes actual se paga sin mora).
    const vencido = cursor.getFullYear() * 12 + cursor.getMonth() < indiceActual;
    const pagada = pagadasMap.get(periodo);
    mensualidades.push(
      pagada
        ? {
            id: pagada.id,
            periodo,
            monto: pagada.monto,
            vencido,
            pagadoEn: pagada.pagadoEn ? pagada.pagadoEn.toISOString() : null,
          }
        : { id: idFicticio--, periodo, monto: CUOTA_BASE, vencido, pagadoEn: null }
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const pendientes = mensualidades.filter((m) => m.pagadoEn === null);
  const vencidas = pendientes.filter((m) => m.vencido);
  // Mora: 1% por cada mes vencido impago, sobre la deuda vencida.
  const moraPorcentaje = vencidas.length;
  const baseVencida = vencidas.reduce((s, m) => s + m.monto, 0);
  const totalMora = redondear(baseVencida * (moraPorcentaje / 100));
  const totalBase = redondear(pendientes.reduce((s, m) => s + m.monto, 0));

  return {
    mensualidades,
    totalDeuda: redondear(totalBase + totalMora),
    totalMora,
    moraPorcentaje,
  };
}

/**
 * Monto a cobrar por un subconjunto de periodos: las cuotas elegidas más la
 * parte de mora que les corresponde (solo la generan los periodos vencidos).
 */
export function calcularMontoPeriodos(
  estado: EstadoCuenta,
  periodos: string[]
): { cuotas: MensualidadCalculada[]; base: number; mora: number; total: number } {
  const elegidas = estado.mensualidades.filter(
    (m) => periodos.includes(m.periodo) && m.pagadoEn === null
  );
  const base = redondear(elegidas.reduce((s, m) => s + m.monto, 0));
  const baseVencidaElegida = elegidas.filter((m) => m.vencido).reduce((s, m) => s + m.monto, 0);
  const mora = redondear(baseVencidaElegida * (estado.moraPorcentaje / 100));
  return { cuotas: elegidas, base, mora, total: redondear(base + mora) };
}
