import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

// MercadoPago exige que auto_return apunte a una URL pública: con FRONTEND_URL
// en localhost rechaza la preferencia con "auto_return invalid". En desarrollo
// se omite y el usuario vuelve al sitio con el botón de la pantalla de pago.
const esUrlPublica = /^https:\/\//.test(process.env.FRONTEND_URL ?? "");
const autoReturn = esUrlPublica ? { auto_return: "approved" as const } : {};

export interface PreferenciaResult {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export async function crearPreferenciaInscripcion(postulacionId: number, email: string): Promise<PreferenciaResult> {
  const preference = new Preference(client);
  const result = await preference.create({
    body: {
      items: [
        {
          id: `inscripcion-${postulacionId}`,
          title: "Inscripción Colegio de Ingenieros del Perú",
          description: "Pago único de inscripción S/3",
          quantity: 1,
          unit_price: 3,
          currency_id: "PEN",
        },
      ],
      payer: { email },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/postulante/${postulacionId}?pago=exitoso`,
        failure: `${process.env.FRONTEND_URL}/postulante/${postulacionId}?pago=fallido`,
        pending: `${process.env.FRONTEND_URL}/postulante/${postulacionId}?pago=pendiente`,
      },
      ...autoReturn,
      external_reference: `inscripcion-${postulacionId}`,
      notification_url: `${process.env.BACKEND_URL}/api/v1/pagos/notificacion`,
    },
  });

  return {
    id: result.id!,
    init_point: result.init_point!,
    sandbox_init_point: result.sandbox_init_point!,
  };
}

/**
 * Referencia de un pago de mensualidades. Se usa "|" como separador porque los
 * periodos son YYYY-MM y partir por "-" haría ambiguo dónde termina cada dato.
 */
export function refMensualidades(colegiadoId: number, periodos: string[]): string {
  return `mensualidades|${colegiadoId}|${periodos.join(",")}`;
}

export function parseRefMensualidades(
  ref: string
): { colegiadoId: number; periodos: string[] } | null {
  const [tipo, id, lista] = ref.split("|");
  if (tipo !== "mensualidades" || !id || !lista) return null;
  const colegiadoId = Number(id);
  if (!Number.isInteger(colegiadoId) || colegiadoId <= 0) return null;
  return { colegiadoId, periodos: lista.split(",").filter(Boolean) };
}

/**
 * Una sola preferencia para todos los periodos seleccionados, más una línea de
 * mora si corresponde. Antes se creaba una preferencia por mes (pagar 10 meses
 * eran 10 checkouts) y la mora no se cobraba nunca.
 */
export async function crearPreferenciaMensualidades(
  colegiadoId: number,
  cuotas: Array<{ periodo: string; monto: number }>,
  mora: number,
  email: string
): Promise<PreferenciaResult> {
  const periodos = cuotas.map((c) => c.periodo);
  const referencia = refMensualidades(colegiadoId, periodos);
  const retorno = `${process.env.FRONTEND_URL}/carnet`;

  const items = cuotas.map((c) => ({
    id: `cuota-${colegiadoId}-${c.periodo}`,
    title: `Cuota ordinaria ${c.periodo} – Colegio de Ingenieros del Perú`,
    quantity: 1,
    unit_price: c.monto,
    currency_id: "PEN",
  }));

  if (mora > 0) {
    items.push({
      id: `mora-${colegiadoId}`,
      title: `Mora por cuotas vencidas (${periodos.length} periodo(s))`,
      quantity: 1,
      unit_price: mora,
      currency_id: "PEN",
    });
  }

  const preference = new Preference(client);
  const result = await preference.create({
    body: {
      items,
      payer: { email },
      back_urls: {
        success: `${retorno}?pago=exitoso`,
        failure: `${retorno}?pago=fallido`,
        pending: `${retorno}?pago=pendiente`,
      },
      ...autoReturn,
      external_reference: referencia,
      notification_url: `${process.env.BACKEND_URL}/api/v1/pagos/notificacion`,
    },
  });

  return {
    id: result.id!,
    init_point: result.init_point!,
    sandbox_init_point: result.sandbox_init_point!,
  };
}

export async function obtenerPago(paymentId: string) {
  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}
