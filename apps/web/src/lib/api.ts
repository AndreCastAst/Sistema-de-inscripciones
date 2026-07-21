import axios from "axios";
import { getToken } from "./auth";
import type {
  DatosDNI,
  Region,
  Carrera,
  FormInscripcionCompleto,
  Postulacion,
  CarnetData,
  PostulacionDetalle,
  CampoObservable,
} from "@/types";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getRegiones(): Promise<Region[]> {
  const { data } = await api.get("/regiones");
  return data;
}

export async function getCarreras(): Promise<Carrera[]> {
  const { data } = await api.get("/carreras");
  return data;
}

export async function consultarDNI(dni: string): Promise<DatosDNI> {
  const { data } = await api.get(`/postulantes/dni/${dni}`);
  return data;
}

export async function crearPostulacion(
  body: FormInscripcionCompleto
): Promise<Postulacion & { comprobanteUrl?: string | null }> {
  const { data } = await api.post("/postulantes", body);
  return data;
}

export async function obtenerCarnet(codigo: string): Promise<CarnetData> {
  const { data } = await api.get(`/carnet/${codigo}`);
  return data;
}

export async function buscarColegiado(query: string): Promise<CarnetData> {
  const { data } = await api.get(`/carnet/${query}`);
  return data;
}

export interface CuotaCuenta {
  id: number | null;
  periodo: string;
  monto: number;
  vencido: boolean;
  pagadoEn: string | null;
  /** Meses transcurridos desde el periodo; negativo si es un adelanto. */
  antiguedad: number;
  /** Interés compuesto ya incluido en `monto`. */
  interes: number;
}

export interface EstadoCuenta {
  colegiado: {
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    codigo: string;
    gmail: string;
    carrera: { nombre: string };
  };
  mensualidades: CuotaCuenta[];
  /** Cuotas futuras que se pueden adelantar sin interés. */
  adelantables: CuotaCuenta[];
  maxMesesAdelanto: number;
  totalDeuda: number;
  totalMora: number;
  moraPorcentaje: number;
}

/**
 * Cuotas pagables en orden: primero la deuda de la más antigua a la más
 * reciente, después los adelantos. Se paga siempre un tramo desde el inicio.
 */
export function cuotasPagables(cuenta: EstadoCuenta): CuotaCuenta[] {
  const pendientes = cuenta.mensualidades.filter((m) => m.pagadoEn === null);
  return [...pendientes, ...(cuenta.adelantables ?? [])];
}

/** Total de las primeras `cantidad` cuotas pagables. */
export function totalPorCantidad(cuenta: EstadoCuenta, cantidad: number) {
  const cuotas = cuotasPagables(cuenta).slice(0, Math.max(0, cantidad));
  const total = Math.round(cuotas.reduce((s, m) => s + m.monto, 0) * 100) / 100;
  const interes = Math.round(cuotas.reduce((s, m) => s + m.interes, 0) * 100) / 100;
  const adelantos = cuotas.filter((m) => m.antiguedad < 0).length;
  return { cuotas, total, interes, adelantos };
}

export async function obtenerEstadoCuenta(query: string): Promise<EstadoCuenta> {
  const { data } = await api.get(`/pagos/${query}`);
  return data;
}

// Separa la deuda pendiente en meses vencidos y mes actual, con los dos
// totales posibles: solo vencidos (con mora) o todo lo pendiente.
export interface DesgloseDeuda {
  vencidas: EstadoCuenta["mensualidades"];
  actual: EstadoCuenta["mensualidades"];
  baseVencida: number;
  totalSoloVencida: number;
  totalConActual: number;
}

export function desglosarDeuda(cuenta: EstadoCuenta): DesgloseDeuda {
  const pendientes = cuenta.mensualidades.filter((m) => m.pagadoEn === null);
  const vencidas = pendientes.filter((m) => m.vencido);
  const actual = pendientes.filter((m) => !m.vencido);
  const baseVencida = Math.round(vencidas.reduce((s, m) => s + m.monto, 0) * 100) / 100;
  const totalSoloVencida = Math.round((baseVencida + cuenta.totalMora) * 100) / 100;
  return { vencidas, actual, baseVencida, totalSoloVencida, totalConActual: cuenta.totalDeuda };
}

// ─── Simulación de pasarela de pagos ─────────────────────────────────────────

export interface RegistrarSimulacionParams {
  banco: string;
  numeroOperacion: string;
  tipo: "inscripcion" | "mensualidades";
  postulacionId?: number;
  codigo?: string;
  periodos?: string[];
}

export async function registrarSimulacion(
  body: RegistrarSimulacionParams
): Promise<{ success: boolean }> {
  const { data } = await api.post("/pagos/simulacion", body);
  return data;
}

// ─── Pasarela MercadoPago ────────────────────────────────────────────────────

export interface PreferenciaPago {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

/** Crea la preferencia de pago de inscripción. Devuelve la URL de MercadoPago. */
export async function crearCheckoutInscripcion(postulacionId: number): Promise<PreferenciaPago> {
  const { data } = await api.post("/pagos/checkout", { postulacionId });
  return data;
}

/**
 * Confirma el pago con el payment_id que MercadoPago devuelve en la URL de
 * retorno. El backend lo verifica contra la API de MercadoPago, así que no
 * depende de que el webhook haya llegado todavía.
 */
export async function confirmarPagoInscripcion(
  postulacionId: number,
  paymentId: string
): Promise<{ pagado: boolean; referencia?: string }> {
  const { data } = await api.post(`/pagos/inscripcion/${postulacionId}/confirmar`, { paymentId });
  return data;
}

export interface PreferenciaMensualidades extends PreferenciaPago {
  total: number;
  mora: number;
  periodos: string[];
}

/**
 * Crea una sola preferencia para todos los periodos elegidos. El monto lo
 * calcula el backend (cuotas + mora); acá no se envía ningún importe.
 */
export async function crearCheckoutMensualidades(
  codigo: string,
  seleccion: { cantidad: number } | { periodos: string[] }
): Promise<PreferenciaMensualidades> {
  const { data } = await api.post("/pagos/mensualidad/checkout", { codigo, ...seleccion });
  return data;
}

export async function confirmarPagoMensualidades(
  paymentId: string
): Promise<{ pagado: boolean; periodos?: string[] }> {
  const { data } = await api.post("/pagos/mensualidad/confirmar", { paymentId });
  return data;
}

/**
 * Consulta si el pago de mensualidades ya se confirmó, sin depender de un
 * payment_id de retorno (el pago por QR ocurre en el celular del cliente, no
 * en esta pantalla).
 */
export async function consultarEstadoMensualidades(
  codigo: string,
  periodos: string[]
): Promise<{ pagado: boolean }> {
  const { data } = await api.get("/pagos/mensualidad/estado", {
    params: { codigo, periodos: periodos.join(",") },
  });
  return data;
}

export interface EstadoPagoInscripcion {
  id: number;
  pagado: boolean;
  referencia: string | null;
  gmail: string;
}

/**
 * Consulta si el webhook de MercadoPago ya confirmó el pago. Al volver de la
 * pasarela el pago suele estar aprobado pero la notificación puede demorar unos
 * segundos, así que la pantalla de retorno consulta esto en intervalos.
 */
export async function consultarEstadoPago(postulacionId: number): Promise<EstadoPagoInscripcion> {
  const { data } = await api.get(`/pagos/inscripcion/${postulacionId}/estado`);
  return data;
}

// ─── Panel revisor ────────────────────────────────────────────────────────────

export interface PostulacionBandejaItem {
  id: number;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  estado: string;
  creadoEn: string;
  region: { nombre: string };
  carrera: { nombre: string } | null;
}

export async function getExpedientes(params?: {
  search?: string;
  page?: number;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}): Promise<{ data: PostulacionBandejaItem[]; total: number; page: number; totalPages: number }> {
  // Omitir parámetros vacíos para no ensuciar la query
  const limpio = Object.fromEntries(
    Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "")
  );
  const { data } = await api.get("/revisor/bandeja", { params: limpio });
  return data;
}

export async function getPostulacionDetalle(id: number): Promise<PostulacionDetalle> {
  const { data } = await api.get(`/postulantes/${id}`);
  return data;
}

export async function aprobarPostulacion(
  id: number,
  especialidad: string,
  fechaAlta?: string
): Promise<{ codigoCIP: string }> {
  const { data } = await api.post(`/revisor/${id}/aprobar`, {
    carreraNombre: especialidad,
    fechaAlta,
  });
  return { codigoCIP: data.codigo };
}

// Mueve el expediente a otra sede cuando el postulante se equivocó de región
// en el formulario público. Solo aplica a expedientes aún no decididos.
export async function redirigirPostulacion(
  id: number,
  regionId: number,
  motivo?: string
): Promise<PostulacionDetalle> {
  const { data } = await api.post(`/revisor/${id}/redirigir`, { regionId, motivo });
  return data;
}

export async function observarPostulacion(
  id: number,
  mensaje: string,
  revisorId: number,
  campos: CampoObservable[]
): Promise<void> {
  await api.post(`/revisor/${id}/observar`, { mensaje, revisorId, campos });
}

// ─── Subsanación presencial (módulo del admin) ───────────────────────────────

/**
 * Busca el expediente OBSERVADO de un DNI dentro de la sede del admin.
 * Lanza con el mensaje del backend para poder distinguir 404 / 403 / 409.
 */
export async function buscarObservadoParaSubsanar(dni: string): Promise<PostulacionDetalle> {
  const { data } = await api.get(`/revisor/subsanacion/${dni}`);
  return data;
}

/** Reemplaza documentos observados en nombre del postulante, desde la sede. */
export async function subsanarComoAdmin(
  id: number,
  body: { fotoUrl?: string; tituloUrl?: string; voucherUrl?: string }
): Promise<PostulacionDetalle> {
  const { data } = await api.post(`/revisor/${id}/subsanar`, body);
  return data;
}

export async function buscarPostulacionPorDNI(
  dni: string
): Promise<PostulacionDetalle> {
  const { data } = await api.get(`/postulantes/buscar/${dni}`);
  return data;
}

export async function subsanarPostulacion(
  id: number,
  body: { fotoUrl?: string; tituloUrl?: string; voucherUrl?: string }
): Promise<void> {
  await api.patch(`/postulantes/${id}`, body);
}

// ─── Subsanación por enlace del correo ───────────────────────────────────────

/** Abre el expediente desde el enlace único, sin pedir DNI. */
export async function getSubsanacionPorToken(token: string): Promise<PostulacionDetalle> {
  const { data } = await api.get(`/postulantes/subsanacion/${token}`);
  return data;
}

export async function subsanarPorToken(
  token: string,
  body: { fotoUrl?: string; tituloUrl?: string; voucherUrl?: string }
): Promise<void> {
  await api.patch(`/postulantes/subsanacion/${token}`, body);
}
