// ─── Enums ────────────────────────────────────────────────────────────────────

export type EstadoPostulacion =
  | "PENDIENTE"
  | "OBSERVADO"
  | "SUBSANADO"
  | "APROBADO"
  | "RECHAZADO";

// ─── Catálogos ────────────────────────────────────────────────────────────────

export interface Region {
  id: number;
  nombre: string;
}

export interface Carrera {
  id: number;
  nombre: string;
}

// ─── Modelos de dominio ───────────────────────────────────────────────────────

export interface Postulacion {
  id: number;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  gmail: string;
  fotoUrl: string | null;
  tituloUrl: string | null;
  voucherUrl: string | null;
  estado: EstadoPostulacion;
  regionId: number;
  carreraId: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface Observacion {
  id: number;
  postulacionId: number;
  mensaje: string;
  revisorId: number;
  creadoEn: Date;
}

export interface Colegiado {
  id: number;
  codigo: string;        // 5 dígitos correlativos por región y carrera
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  regionId: number;
  carreraId: number;
  fotoUrl: string | null;
  fechaAlta: Date;
  habilitado: boolean;
}

export interface Mensualidad {
  id: number;
  colegiadoId: number;
  periodo: string;       // formato YYYY-MM
  monto: number;         // S/20 por defecto
  pagadoEn: Date | null; // null = pendiente de pago
}

export interface Revisor {
  id: number;
  nombres: string;
  regionId: number;
}

export interface Auditoria {
  id: number;
  accion: string;
  entidad: string;
  entidadId: number;
  actorId: number | null;
  fecha: Date;
}

// ─── Tipos con relaciones incluidas (resultado de include en Prisma) ──────────

export interface PostulacionDetalle extends Postulacion {
  region: Region;
  carrera: Carrera;
  observaciones: Observacion[];
}

export interface PostulacionBandeja extends Postulacion {
  region: Region;
  carrera: Carrera;
}

export interface ColegiadoDetalle extends Colegiado {
  region: Region;
  carrera: Carrera;
}

// ─── Respuesta del endpoint GET /carnet/:codigo ───────────────────────────────

export interface CarnetResponse extends ColegiadoDetalle {
  inhabilitado: boolean; // true si tiene mensualidades sin pagar
}

// ─── Cuerpos de request (entrada a los endpoints) ─────────────────────────────

export interface CrearPostulacionBody {
  dni: string;            // exactamente 8 dígitos
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  gmail: string;
  regionId: number;
  carreraId: number;
  fotoUrl?: string;       // URL de Cloudinary, se completa antes o después del registro
  tituloUrl?: string;
  voucherUrl?: string;
}

export interface SubsanarPostulacionBody {
  fotoUrl?: string;
  tituloUrl?: string;
  voucherUrl?: string;
}

export interface ObservarBody {
  mensaje: string;        // mínimo 10 caracteres
  revisorId: number;
}

export interface CargarVoucherBody {
  postulacionId: number;
  voucherUrl: string;     // URL de Cloudinary del comprobante
}

export interface PagarMensualidadBody {
  colegiadoId: number;
  periodo: string;        // YYYY-MM
}

// ─── Respuestas de error estándar ─────────────────────────────────────────────

export interface RespuestaError {
  error: string;
  detalles?: unknown;
}

export interface RespuestaSalud {
  status: "ok";
}

export interface RespuestaOk {
  ok: true;
}

// ─── API externa: RENIEC (vía apis.net.pe) ────────────────────────────────────

/** Respuesta cruda que devuelve apis.net.pe */
export interface ReniecApiRespuesta {
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

/** Estructura interna que expone el servicio reniec.ts */
export interface DatosDNI {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

// ─── API externa: Cloudinary ──────────────────────────────────────────────────

export type TipoArchivo = "foto" | "titulo" | "voucher";

export interface SubidaCloudinaryResultado {
  url: string;           // secure_url devuelto por Cloudinary
  tipo: TipoArchivo;
}

// ─── API externa: Resend ──────────────────────────────────────────────────────

export interface EmailObservacion {
  destinatario: string;
  mensaje: string;
}

export interface EmailAprobacion {
  destinatario: string;
  codigoColegiado: string;
}
