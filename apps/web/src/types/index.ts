// ─── Enums ────────────────────────────────────────────────────────────────────

export type EstadoPostulacion =
  | "PENDIENTE"
  | "OBSERVADO"
  | "SUBSANADO"
  | "APROBADO"
  | "RECHAZADO";

// Etiquetas legibles para mostrar en la UI
export const ESTADO_LABEL: Record<EstadoPostulacion, string> = {
  PENDIENTE: "Pendiente de revisión",
  OBSERVADO: "Observado",
  SUBSANADO: "Subsanado",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

// Colores Tailwind por estado para badges
export const ESTADO_COLOR: Record<EstadoPostulacion, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  OBSERVADO: "bg-orange-100 text-orange-800",
  SUBSANADO: "bg-blue-100 text-blue-800",
  APROBADO: "bg-green-100 text-green-800",
  RECHAZADO: "bg-red-100 text-red-800",
};

// ─── Catálogos ────────────────────────────────────────────────────────────────

export interface Region {
  id: number;
  nombre: string;
}

export interface Carrera {
  id: number;
  nombre: string;
}

// ─── Modelos de dominio (espejo de lo que devuelve el backend) ────────────────

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
  creadoEn: string;      // el frontend recibe fechas como string ISO
  actualizadoEn: string;
}

export interface Observacion {
  id: number;
  postulacionId: number;
  mensaje: string;
  revisorId: number;
  creadoEn: string;
}

export interface Colegiado {
  id: number;
  codigo: string;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  regionId: number;
  carreraId: number;
  fotoUrl: string | null;
  fechaAlta: string;
  habilitado: boolean;
}

export interface Mensualidad {
  id: number;
  colegiadoId: number;
  periodo: string;        // YYYY-MM
  monto: number;
  pagadoEn: string | null;
}

// ─── Respuestas compuestas del API ────────────────────────────────────────────

export interface PostulacionDetalle extends Postulacion {
  region: Region;
  carrera: Carrera | null;
  observaciones: Observacion[];
}

export interface PostulacionBandeja extends Postulacion {
  region: Region;
  carrera: Carrera;
}

export interface CarnetData extends Colegiado {
  region: Region;
  carrera: Carrera;
  inhabilitado: boolean;   // true si tiene mensualidades impagas
}

// ─── Datos que devuelve RENIEC al consultar un DNI ───────────────────────────

export interface DatosDNI {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

// ─── Tipos de los formularios del frontend ───────────────────────────────────

/** Paso 1 del formulario de inscripción: datos personales */
export interface FormDatosPersonales {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  gmail: string;
  regionId: number;
  carreraId?: number;
}

/** Paso 2 del formulario de inscripción: carga de documentos */
export interface FormDocumentos {
  foto: File | null;        // JPG/PNG, máx 2 MB, ratio 3:4
  titulo: File | null;      // PDF, máx 5 MB
  voucher: File | null;     // JPG/PNG/PDF, máx 5 MB
}

/** Payload completo que se envía al backend al crear una postulación */
export interface FormInscripcionCompleto extends FormDatosPersonales {
  fotoUrl?: string;
  tituloUrl?: string;
  voucherUrl?: string;
  esFisico?: boolean;
}

/** Formulario de subsanación: el postulante corrige documentos observados */
export interface FormSubsanacion {
  postulacionId: number;
  foto?: File | null;
  titulo?: File | null;
  voucher?: File | null;
}

/** Formulario del revisor para agregar una observación */
export interface FormObservacion {
  mensaje: string;          // mínimo 10 caracteres
  revisorId: number;
}

// ─── Estado de UI ─────────────────────────────────────────────────────────────

/** Estado del formulario de inscripción multi-paso */
export type PasoInscripcion = "datos" | "documentos" | "revision" | "enviado";

export interface EstadoFormulario {
  paso: PasoInscripcion;
  cargando: boolean;
  error: string | null;
}

/** Estado de carga de un archivo individual */
export type EstadoCarga = "idle" | "subiendo" | "listo" | "error";

export interface ArchivoCargado {
  estado: EstadoCarga;
  url: string | null;
  error: string | null;
}

/** Lo que muestra el carnet en pantalla */
export interface CarnetUI {
  nombreCompleto: string;
  codigo: string;
  region: string;
  carrera: string;
  fotoUrl: string | null;
  fechaAlta: string;
  habilitado: boolean;
}

// ─── Respuestas genéricas del API ─────────────────────────────────────────────

export interface ApiError {
  error: string;
  detalles?: unknown;
}
