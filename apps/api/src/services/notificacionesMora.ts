import { PrismaClient } from "@prisma/client";
import { enviarNotificacionDeudaMes } from "./email";

const prisma = new PrismaClient();

const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Periodos (YYYY-MM) impagos ESTRICTAMENTE anteriores al mes actual.
// El mes en curso es periodo de gracia (no genera notificación).
function mesesVencidos(fechaAlta: Date, pagadas: Set<string>): string[] {
  const ahora = new Date();
  const primerMes = new Date(fechaAlta.getFullYear(), fechaAlta.getMonth() + 1, 1);
  const mesActualInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const vencidos: string[] = [];
  const cursor = new Date(primerMes);
  while (cursor < mesActualInicio) {
    const periodo = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    if (!pagadas.has(periodo)) vencidos.push(periodo);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return vencidos;
}

/**
 * Envía un correo por cada mes vencido de cada colegiado que aún NO haya sido
 * notificado (incluye meses pasados). Tras enviar, marca la fila como
 * notificado=true para no repetir. El índice único (colegiadoId, periodo)
 * garantiza idempotencia: un correo por mes, una sola vez.
 */
export async function procesarNotificaciones(): Promise<{ enviados: number }> {
  const colegiados = await prisma.colegiado.findMany({
    include: {
      mensualidades: { where: { pagadoEn: { not: null } }, select: { periodo: true } },
      notificaciones: { where: { notificado: true }, select: { periodo: true } },
    },
  });

  let enviados = 0;

  for (const col of colegiados) {
    const pagadas = new Set(col.mensualidades.map((m) => m.periodo));
    const yaNotificados = new Set(col.notificaciones.map((n) => n.periodo));
    const vencidos = mesesVencidos(col.fechaAlta, pagadas);

    for (const periodo of vencidos) {
      if (yaNotificados.has(periodo)) continue; // ya se le envió el correo de ese mes

      try {
        await enviarNotificacionDeudaMes(col.gmail, col.nombres, periodo, col.codigo);
        await prisma.notificacionMora.upsert({
          where: { colegiadoId_periodo: { colegiadoId: col.id, periodo } },
          update: { notificado: true, enviadoEn: new Date() },
          create: { colegiadoId: col.id, periodo, notificado: true },
        });
        enviados++;
      } catch (e) {
        console.error(`[NotifMora] Error notificando a ${col.gmail} (${periodo}):`, e);
      }
    }
  }

  return { enviados };
}

/**
 * Corre las notificaciones una vez al arrancar (para enviar de inmediato los
 * meses vencidos aún no notificados, incluidos los pasados) y luego cada día.
 */
export function iniciarJobNotificaciones(): void {
  const correr = async () => {
    try {
      const { enviados } = await procesarNotificaciones();
      if (enviados > 0) console.log(`[NotifMora] ${enviados} correo(s) de deuda enviados.`);
    } catch (e) {
      console.error("[NotifMora] Error en job de notificaciones:", e);
    }
  };
  correr();
  setInterval(correr, UN_DIA_MS);
}
