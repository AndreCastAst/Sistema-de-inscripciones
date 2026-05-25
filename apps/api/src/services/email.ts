import axios from "axios";

const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const SENDER_EMAIL = "renzoprincipeguadiamosprincipe@gmail.com";
const SENDER_NAME = "Colegio de Ingenieros del Perú";

async function enviar(to: string, subject: string, html: string) {
  const res = await axios.post(
    BREVO_URL,
    {
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    },
    {
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data;
}

export async function enviarObservacion(to: string, mensaje: string, postulacionId: number) {
  await enviar(
    to,
    "Tu expediente tiene una observación – Colegio de Ingenieros",
    `
      <h2>Observación en tu solicitud de colegiatura</h2>
      <p>El revisor asignado ha registrado la siguiente observación en tu expediente:</p>
      <blockquote style="border-left:4px solid #ccc; padding:10px; margin:10px 0; color:#555;">
        ${mensaje}
      </blockquote>
      <p>Para subsanar, ingresa a la plataforma con tu número de solicitud: <strong>#${postulacionId}</strong></p>
      <p>No hay límite de intentos para corregir tu expediente.</p>
    `
  );
}

export async function enviarAprobacion(to: string, codigo: string, nombres: string) {
  await enviar(
    to,
    "¡Felicitaciones! Tu colegiatura fue aprobada",
    `
      <h2>¡Bienvenido al Colegio de Ingenieros del Perú!</h2>
      <p>Estimado/a ${nombres},</p>
      <p>Nos complace informarte que tu solicitud de colegiatura ha sido <strong>aprobada</strong>.</p>
      <p>Tu código de colegiado es: <strong style="font-size:24px;">${codigo}</strong></p>
      <p>Puedes acceder a tu carnet digital en cualquier momento ingresando tu código en la plataforma.</p>
      <p>Recuerda que a partir del próximo mes deberás abonar la cuota mensual de S/20 para mantener tu habilitación.</p>
    `
  );
}

export async function enviarRecordatorioPago(to: string, nombres: string, mesesPendientes: number, deudaTotal: number) {
  await enviar(
    to,
    "Tienes cuotas pendientes – Colegio de Ingenieros",
    `
      <h2>Aviso de morosidad</h2>
      <p>Estimado/a ${nombres},</p>
      <p>Tienes <strong>${mesesPendientes} cuota(s)</strong> pendiente(s) por un total de <strong>S/ ${deudaTotal.toFixed(2)}</strong>.</p>
      <p>Tu carnet muestra la marca "Inhabilitado/Moroso" mientras exista deuda.</p>
      <p>No hay penalidades: paga cuando puedas para rehabilitar tu condición al instante.</p>
    `
  );
}
