import axios from "axios";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? process.env.EMAIL_USER ?? "renzoprincipeguadiamosprincipe@gmail.com";
const SENDER_NAME = "Colegio de Ingenieros del Perú";

async function enviar(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer; contentType: string }[]
) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY no configurada");

  const payload: Record<string, unknown> = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  if (attachments?.length) {
    payload.attachment = attachments.map((a) => ({
      name: a.filename,
      content: a.content.toString("base64"),
    }));
  }

  const { data } = await axios.post(BREVO_URL, payload, {
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
  });

  console.log(`[Email] ✉  Enviado a ${to} — messageId: ${data.messageId}`);
}

// ─────────────────────────────────────────────────────────────────────────────

export async function enviarConfirmacionInscripcion(
  to: string,
  datos: {
    postulacionId: number;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    dni: string;
    voucherUrl?: string;
    pdfBuffer?: Buffer;
  }
) {
  const { postulacionId, nombres, apellidoPaterno, apellidoMaterno, dni, voucherUrl, pdfBuffer } = datos;
  const nombreCompleto = `${apellidoPaterno} ${apellidoMaterno}, ${nombres}`;
  const esPasarela = voucherUrl?.startsWith("SIM-");
  const fecha = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora  = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  const filaPago = voucherUrl
    ? `<tr style="background:#f9f9f9;">
         <td style="padding:10px 12px;border:1px solid #e0e0e0;font-weight:600;">Referencia de Pago</td>
         <td style="padding:10px 12px;border:1px solid #e0e0e0;font-family:monospace;font-size:12px;">${voucherUrl}</td>
       </tr>`
    : "";

  const badgePago = esPasarela
    ? `<div style="display:inline-block;background:#e8f5e9;color:#2e7d32;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:12px;">✓ Pago procesado por pasarela integrada</div>`
    : voucherUrl
    ? `<div style="display:inline-block;background:#fff8e1;color:#f57f17;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:12px;">⏳ Voucher adjunto — pendiente de verificación</div>`
    : "";

  const attachments = pdfBuffer
    ? [{ filename: `Boleta-CIP-Inscripcion.pdf`, content: pdfBuffer, contentType: "application/pdf" }]
    : undefined;

  await enviar(
    to,
    `✅ Solicitud recibida — Colegio de Ingenieros del Perú`,
    `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #ddd;border-radius:10px;overflow:hidden;">

      <div style="background:#003DA5;color:white;padding:24px;text-align:center;">
        <h2 style="margin:0;font-size:20px;letter-spacing:0.5px;">COLEGIO DE INGENIEROS DEL PERÚ</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:0.85;">RUC: 20100149286 · Av. Arequipa 4947, Miraflores, Lima</p>
      </div>

      <div style="background:#e8eef8;padding:16px;text-align:center;border-bottom:1px solid #c8d4ec;">
        <p style="margin:0;font-size:15px;font-weight:700;color:#003DA5;">COMPROBANTE DE SOLICITUD DE INSCRIPCIÓN</p>
      </div>

      <div style="padding:24px;">
        <p style="color:#333;font-size:14px;margin-bottom:4px;">Estimado/a <strong>${nombreCompleto}</strong>,</p>
        <p style="color:#555;font-size:14px;margin-bottom:16px;">Hemos recibido correctamente tu solicitud de inscripción al Colegio de Ingenieros del Perú.</p>

        ${badgePago}

        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:10px 12px;border:1px solid #e0e0e0;font-weight:600;width:45%;">Fecha y hora</td>
            <td style="padding:10px 12px;border:1px solid #e0e0e0;">${fecha} · ${hora}</td>
          </tr>
          <tr style="background:#f9f9f9;">
            <td style="padding:10px 12px;border:1px solid #e0e0e0;font-weight:600;">Apellidos y Nombres</td>
            <td style="padding:10px 12px;border:1px solid #e0e0e0;">${nombreCompleto}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border:1px solid #e0e0e0;font-weight:600;">DNI</td>
            <td style="padding:10px 12px;border:1px solid #e0e0e0;">${dni}</td>
          </tr>
          <tr style="background:#f9f9f9;">
            <td style="padding:10px 12px;border:1px solid #e0e0e0;font-weight:600;">N° Expediente</td>
            <td style="padding:10px 12px;border:1px solid #e0e0e0;font-family:monospace;">#${postulacionId}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border:1px solid #e0e0e0;font-weight:600;">Concepto</td>
            <td style="padding:10px 12px;border:1px solid #e0e0e0;">Derecho de Inscripción – Colegiatura CIP</td>
          </tr>
          <tr style="background:#f9f9f9;">
            <td style="padding:10px 12px;border:1px solid #e0e0e0;font-weight:600;">Monto</td>
            <td style="padding:10px 12px;border:1px solid #e0e0e0;font-size:18px;font-weight:700;color:#003DA5;">S/ 3.00</td>
          </tr>
          ${filaPago}
          <tr style="background:#f9f9f9;">
            <td style="padding:10px 12px;border:1px solid #e0e0e0;font-weight:600;">Estado</td>
            <td style="padding:10px 12px;border:1px solid #e0e0e0;color:#f57f17;font-weight:600;">⏳ Pendiente de revisión</td>
          </tr>
        </table>

        <div style="margin-top:20px;padding:14px;background:#e8f5e9;border-left:4px solid #4caf50;border-radius:4px;font-size:13px;color:#2e7d32;">
          <strong>✓ Tu solicitud fue enviada correctamente.</strong><br>
          Un revisor de tu región evaluará tu expediente y te notificará por este correo cuando haya una actualización.
        </div>

        <div style="margin-top:16px;padding:14px;background:#f5f5f5;border-radius:4px;font-size:13px;color:#555;">
          <strong>¿Qué sigue?</strong>
          <ol style="margin:8px 0 0 16px;padding:0;">
            <li style="margin-bottom:4px;">Un revisor evaluará tu expediente.</li>
            <li style="margin-bottom:4px;">Si hay observaciones, recibirás un correo indicando qué corregir.</li>
            <li>Al ser aprobado recibirás tu código CIP por este correo.</li>
          </ol>
        </div>

        <p style="font-size:11px;color:#aaa;margin-top:20px;text-align:center;border-top:1px solid #eee;padding-top:12px;">
          Colegio de Ingenieros del Perú · Sistema de Inscripciones
        </p>
      </div>
    </div>
    `,
    attachments
  );
}

export async function enviarObservacion(
  to: string,
  mensaje: string,
  postulacionId: number,
  linkSubsanacion: string = `${process.env.FRONTEND_URL}/subsanacion`
) {
  await enviar(
    to,
    "⚠️ Observación en tu expediente – Colegio de Ingenieros del Perú",
    `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #ddd;border-radius:10px;overflow:hidden;">
      <div style="background:#003DA5;color:white;padding:24px;text-align:center;">
        <h2 style="margin:0;font-size:20px;">COLEGIO DE INGENIEROS DEL PERÚ</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:0.85;">Sistema de Inscripciones Virtual</p>
      </div>
      <div style="background:#fff8e1;padding:16px;text-align:center;border-bottom:1px solid #ffe082;">
        <p style="margin:0;font-size:15px;font-weight:700;color:#f57f17;">⚠ Tu expediente #${postulacionId} tiene observaciones</p>
      </div>
      <div style="padding:24px;">
        <p style="color:#333;font-size:14px;">El revisor regional ha registrado la siguiente observación en tu expediente:</p>
        <blockquote style="border-left:4px solid #f57f17;padding:12px 16px;margin:16px 0;color:#555;background:#fff8e1;border-radius:0 8px 8px 0;font-size:14px;">
          ${mensaje}
        </blockquote>
        <p style="color:#555;font-size:14px;">Para subsanar tu expediente, haz clic en el botón a continuación. No se aplicarán cargos adicionales.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${linkSubsanacion}"
             style="background:#003DA5;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
            Subsanar mi Expediente →
          </a>
        </div>
        <div style="background:#f5f5f5;border-radius:6px;padding:14px;font-size:12px;color:#777;">
          <strong>Nota:</strong> Este enlace es válido por <strong>72 horas</strong>.
          Si venció, visita <a href="${process.env.FRONTEND_URL}/subsanacion" style="color:#003DA5;">${process.env.FRONTEND_URL}/subsanacion</a>
          e ingresa con tu DNI.
        </div>
        <p style="font-size:11px;color:#aaa;margin-top:20px;text-align:center;border-top:1px solid #eee;padding-top:12px;">
          Colegio de Ingenieros del Perú · Sistema de Inscripciones
        </p>
      </div>
    </div>
    `
  );
}

export async function enviarAprobacion(to: string, codigo: string, nombres: string) {
  await enviar(
    to,
    "¡Felicitaciones! Tu colegiatura fue aprobada – CIP",
    `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:10px;overflow:hidden;">
        <div style="background:#003DA5;color:white;padding:24px;text-align:center;">
          <h2 style="margin:0;font-size:20px;">COLEGIO DE INGENIEROS DEL PERÚ</h2>
        </div>
        <div style="padding:24px;">
          <h3 style="color:#2e7d32;">¡Bienvenido al Colegio de Ingenieros del Perú!</h3>
          <p style="color:#333;">Estimado/a <strong>${nombres}</strong>,</p>
          <p style="color:#555;">Tu solicitud de inscripción fue <strong>aprobada</strong>. Tu código de colegiado es:</p>
          <p style="font-size:32px;font-weight:700;color:#003DA5;text-align:center;letter-spacing:2px;padding:16px;background:#e8eef8;border-radius:8px;">${codigo}</p>
          <p style="color:#555;font-size:13px;">Recuerda abonar la cuota mensual de S/1 para mantener tu habilitación.</p>
          <p style="font-size:11px;color:#aaa;margin-top:20px;text-align:center;border-top:1px solid #eee;padding-top:12px;">
            Colegio de Ingenieros del Perú · Sistema de Inscripciones
          </p>
        </div>
      </div>
    `
  );
}

export async function enviarRecordatorioPago(to: string, nombres: string, mesesPendientes: number, deudaTotal: number) {
  await enviar(
    to,
    "Tienes cuotas pendientes – Colegio de Ingenieros del Perú",
    `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:10px;overflow:hidden;">
        <div style="background:#003DA5;color:white;padding:24px;text-align:center;">
          <h2 style="margin:0;font-size:20px;">COLEGIO DE INGENIEROS DEL PERÚ</h2>
        </div>
        <div style="padding:24px;">
          <h3 style="color:#f57f17;">Aviso de cuotas pendientes</h3>
          <p style="color:#333;">Estimado/a <strong>${nombres}</strong>,</p>
          <p style="color:#555;">Tienes <strong>${mesesPendientes} cuota(s) pendiente(s)</strong> por un total de:</p>
          <p style="font-size:28px;font-weight:700;color:#003DA5;text-align:center;">S/ ${deudaTotal.toFixed(2)}</p>
          <p style="color:#555;font-size:13px;">Regulariza tu situación para mantener tu condición de colegiado habilitado.</p>
          <p style="font-size:11px;color:#aaa;margin-top:20px;text-align:center;border-top:1px solid #eee;padding-top:12px;">
            Colegio de Ingenieros del Perú · Sistema de Inscripciones
          </p>
        </div>
      </div>
    `
  );
}
