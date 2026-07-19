import { PrismaClient } from "@prisma/client";
import { enviarNotificacionDeudaMes } from "./email";

const prisma = new PrismaClient();

const UN_DIA_MS = 24 * 60 * 60 * 1000;
const MARCADOR_BACKFILL = "INIT_NOTIF_MORA";

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
 * Revisa todos los colegiados y, por cada mes vencido no gestionado aún,
 * registra una fila en NotificacionMora. Si `enviarCorreos` es true y la
 * fila es nueva (no existía), envía el correo. El índice único
 * (colegiadoId, periodo) garantiza idempotencia: un correo por mes, una vez.
 */
export async function procesarNotificaciones({ enviarCorreos }: { enviarCorreos: boolean }): Promise<{ enviados: number; registrados: number }> {
  const colegiados = await prisma.colegiado.findMany({
    include: {
      mensualidades: { where: { pagadoEn: { not: null } }, select: { periodo: true } },
    },
  });

  let enviados = 0;
  let registrados = 0;

  for (const col of colegiados) {
    const pagadas = new Set(col.mensualidades.map((m) => m.periodo));
    const vencidos = mesesVencidos(col.fechaAlta, pagadas);

    for (const periodo of vencidos) {
      try {
        await prisma.notificacionMora.create({
          data: { colegiadoId: col.id, periodo, notificado: enviarCorreos },
        });
        registrados++;
      } catch (err: any) {
        // P2002 = ya existe (colegiadoId, periodo): ya gestionado, se salta.
        if (err?.code === "P2002") continue;
        throw err;
      }

      if (enviarCorreos) {
        try {
          await enviarNotificacionDeudaMes(col.gmail, col.nombres, periodo, col.codigo);
          enviados++;
        } catch (e) {
          console.error(`[NotifMora] Error enviando correo a ${col.gmail} (${periodo}):`, e);
        }
      }
    }
  }

  return { enviados, registrados };
}

/**
 * Backfill único: la primera vez, reclama todos los meses vencidos actuales
 * SIN enviar correos (queda como "ya gestionado"), para que las notificaciones
 * sean solo de aquí en adelante. Se ejecuta una sola vez gracias al marcador
 * en Auditoria.
 */
export async function inicializarNotificacionesMora(): Promise<void> {
  const yaInicializado = await prisma.auditoria.findFirst({ where: { accion: MARCADOR_BACKFILL } });
  if (yaInicializado) return;

  const { registrados } = await procesarNotificaciones({ enviarCorreos: false });
  await prisma.auditoria.create({
    data: {
      accion: MARCADOR_BACKFILL,
      entidad: "NotificacionMora",
      entidadId: 0,
      detalle: `Backfill inicial: ${registrados} meses vencidos marcados sin envío.`,
    },
  });
  console.log(`[NotifMora] Backfill inicial completado: ${registrados} periodos marcados (sin correos).`);
}

/**
 * Job diario dentro del proceso del API: envía notificaciones por los meses
 * que se vayan venciendo de aquí en adelante.
 */
export function iniciarJobNotificaciones(): void {
  const correr = async () => {
    try {
      const { enviados } = await procesarNotificaciones({ enviarCorreos: true });
      if (enviados > 0) console.log(`[NotifMora] Job diario: ${enviados} correo(s) de deuda enviados.`);
    } catch (e) {
      console.error("[NotifMora] Error en job diario:", e);
    }
  };
  setInterval(correr, UN_DIA_MS);
}
