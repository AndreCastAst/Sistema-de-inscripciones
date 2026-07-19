import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

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
      auto_return: "approved",
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

export async function crearPreferenciaMensualidad(colegiadoId: number, periodo: string, email: string): Promise<PreferenciaResult> {
  const preference = new Preference(client);
  const result = await preference.create({
    body: {
      items: [
        {
          id: `mensualidad-${colegiadoId}-${periodo}`,
          title: `Mensualidad ${periodo} – Colegio de Ingenieros del Perú`,
          description: "Cuota mensual S/1",
          quantity: 1,
          unit_price: 1,
          currency_id: "PEN",
        },
      ],
      payer: { email },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/colegiado?pago=exitoso&periodo=${periodo}`,
        failure: `${process.env.FRONTEND_URL}/colegiado?pago=fallido&periodo=${periodo}`,
        pending: `${process.env.FRONTEND_URL}/colegiado?pago=pendiente&periodo=${periodo}`,
      },
      auto_return: "approved",
      external_reference: `mensualidad-${colegiadoId}-${periodo}`,
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
