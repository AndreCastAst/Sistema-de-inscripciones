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
): Promise<Postulacion> {
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

export interface EstadoCuenta {
  colegiado: {
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    codigo: string;
    gmail: string;
    carrera: { nombre: string };
  };
  mensualidades: Array<{
    id: number;
    periodo: string;
    monto: number;
    vencido: boolean;
    pagadoEn: string | null;
  }>;
  totalDeuda: number;
  totalMora: number;
  moraPorcentaje: number;
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

export async function observarPostulacion(
  id: number,
  mensaje: string,
  revisorId: number
): Promise<void> {
  await api.post(`/revisor/${id}/observar`, { mensaje, revisorId });
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
