import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.MAIL_FROM ?? "Colegio de Ingenieros <noreply@example.com>";

export async function enviarObservacion(to: string, mensaje: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Tu expediente tiene una observación",
    html: `<p>Tu expediente fue observado:</p><blockquote>${mensaje}</blockquote>`,
  });
}

export async function enviarAprobacion(to: string, codigo: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "¡Felicitaciones! Tu inscripción fue aprobada",
    html: `<p>Tu código de colegiado es: <strong>${codigo}</strong></p>`,
  });
}
