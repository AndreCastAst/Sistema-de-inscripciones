import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const CUOTA_BASE = 1;
/** Interés mensual compuesto sobre el monto debido del mes anterior. */
export const TASA_MENSUAL = 0.01;
/** Cuántos meses hacia adelante se permite adelantar cuotas. */
export const MAX_MESES_ADELANTO = 12;

export interface MensualidadCalculada {
  id: number | null;
  periodo: string;
  monto: number;
  vencido: boolean;
  pagadoEn: string | null;
  /** Meses transcurridos desde el periodo; negativo si es un adelanto. */
  antiguedad: number;
  /** Interés acumulado incluido en `monto` (0 en cuotas al día y adelantos). */
  interes: number;
}

export interface EstadoCuenta {
  mensualidades: MensualidadCalculada[];
  /** Cuotas futuras que se pueden adelantar, hasta MAX_MESES_ADELANTO. */
  adelantables: MensualidadCalculada[];
  totalDeuda: number;
  totalMora: number;
  moraPorcentaje: number;
}

// Los importes por cuota se guardan con 4 decimales: redondear a 2 aplanaría el
// interés compuesto (1.0201 se volvería 1.02 y la progresión se vería lineal).
// Solo el total que se cobra se redondea a 2, que es lo que acepta la pasarela.
const redondear4 = (n: number) => Math.round(n * 10000) / 10000;
const redondear = (n: number) => Math.round(n * 100) / 100;
const indiceDe = (d: Date) => d.getFullYear() * 12 + d.getMonth();
const periodoDe = (i: number) =>
  `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;

/**
 * Monto de una cuota según su antigüedad, con interés compuesto: cada mes que
 * pasa suma 1% sobre lo que ya se debía.
 *
 *   al día / adelanto → 1.0000
 *   1 mes de atraso   → 1.0100
 *   2 meses           → 1.0201   (1% sobre 1.01)
 *
 * Los adelantos no generan interés: se paga la cuota base.
 */
export function montoConInteres(antiguedad: number): { monto: number; interes: number } {
  if (antiguedad <= 0) return { monto: CUOTA_BASE, interes: 0 };
  const monto = redondear4(CUOTA_BASE * Math.pow(1 + TASA_MENSUAL, antiguedad));
  return { monto, interes: redondear4(monto - CUOTA_BASE) };
}

/**
 * Calcula la deuda de un colegiado desde su fecha de alta hasta hoy, más las
 * cuotas futuras que puede adelantar.
 *
 * Vive acá y no en la ruta porque el estado de cuenta y el cobro por pasarela
 * tienen que dar exactamente el mismo número: si la pantalla y MercadoPago
 * calcularan por separado, el colegiado pagaría un importe distinto al que ve.
 */
export async function calcularEstadoCuenta(
  colegiadoId: number,
  fechaAlta: Date
): Promise<EstadoCuenta> {
  const ahora = new Date();
  const indiceActual = indiceDe(ahora);
  const primerMes = new Date(fechaAlta.getFullYear(), fechaAlta.getMonth() + 1, 1);
  const indicePrimero = indiceDe(primerMes);

  const pagadas = await prisma.mensualidad.findMany({
    where: { colegiadoId },
    select: { id: true, periodo: true, monto: true, pagadoEn: true },
  });
  const pagadasMap = new Map(pagadas.map((m) => [m.periodo, m]));

  const construir = (i: number): MensualidadCalculada => {
    const periodo = periodoDe(i);
    const antiguedad = indiceActual - i;
    const pagada = pagadasMap.get(periodo);
    if (pagada) {
      return {
        id: pagada.id,
        periodo,
        monto: pagada.monto,
        vencido: antiguedad > 0,
        pagadoEn: pagada.pagadoEn ? pagada.pagadoEn.toISOString() : null,
        antiguedad,
        interes: 0,
      };
    }
    const { monto, interes } = montoConInteres(antiguedad);
    return { id: null, periodo, monto, vencido: antiguedad > 0, pagadoEn: null, antiguedad, interes };
  };

  // Cuotas devengadas: del primer mes tras el alta hasta el mes actual.
  const mensualidades: MensualidadCalculada[] = [];
  for (let i = indicePrimero; i <= indiceActual; i++) mensualidades.push(construir(i));

  // Cuotas futuras adelantables (sin interés), omitiendo las ya pagadas.
  const adelantables: MensualidadCalculada[] = [];
  for (let i = indiceActual + 1; i <= indiceActual + MAX_MESES_ADELANTO; i++) {
    const m = construir(i);
    if (m.pagadoEn === null) adelantables.push(m);
  }

  const pendientes = mensualidades.filter((m) => m.pagadoEn === null);
  const totalMora = redondear(pendientes.reduce((s, m) => s + m.interes, 0));
  const totalDeuda = redondear(pendientes.reduce((s, m) => s + m.monto, 0));
  // pendientes viene en orden cronológico, así que la primera es la más atrasada.
  const masAntigua = pendientes[0]?.antiguedad ?? 0;

  return {
    mensualidades,
    adelantables,
    totalDeuda,
    totalMora,
    // Porcentaje acumulado sobre la cuota más atrasada, para mostrar en pantalla.
    moraPorcentaje: masAntigua > 0 ? redondear((Math.pow(1 + TASA_MENSUAL, masAntigua) - 1) * 100) : 0,
  };
}

/**
 * Cuotas seleccionables: siempre se paga de la más antigua hacia la más
 * reciente, sin huecos. Permitir saltear meses dejaría deuda vieja acumulando
 * interés mientras se pagan meses nuevos.
 */
export function cuotasPagables(estado: EstadoCuenta): MensualidadCalculada[] {
  const pendientes = estado.mensualidades.filter((m) => m.pagadoEn === null);
  return [...pendientes, ...estado.adelantables];
}

/**
 * Monto de las primeras `cantidad` cuotas pagables, en orden cronológico.
 */
export function calcularMontoPorCantidad(
  estado: EstadoCuenta,
  cantidad: number
): { cuotas: MensualidadCalculada[]; base: number; interes: number; total: number } {
  const elegidas = cuotasPagables(estado).slice(0, Math.max(0, cantidad));
  return resumir(elegidas);
}

/**
 * Monto de un conjunto explícito de periodos. Se valida que sean un prefijo
 * contiguo desde la cuota más antigua: si no, se rechaza.
 */
export function calcularMontoPeriodos(
  estado: EstadoCuenta,
  periodos: string[]
): { cuotas: MensualidadCalculada[]; base: number; interes: number; total: number; contiguo: boolean } {
  const pagables = cuotasPagables(estado);
  const pedidos = new Set(periodos);
  const elegidas = pagables.filter((m) => pedidos.has(m.periodo));
  // Debe coincidir con los primeros N de la lista ordenada.
  const esperado = pagables.slice(0, elegidas.length).map((m) => m.periodo);
  const contiguo =
    elegidas.length === periodos.length &&
    esperado.every((p, i) => p === elegidas[i].periodo);
  return { ...resumir(elegidas), contiguo };
}

function resumir(cuotas: MensualidadCalculada[]) {
  const total = redondear(cuotas.reduce((s, m) => s + m.monto, 0));
  const interes = redondear(cuotas.reduce((s, m) => s + m.interes, 0));
  return { cuotas, base: redondear(total - interes), interes, total };
}
