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
    pagadoEn: string | null;
  }>;
  totalDeuda: number;
}

export async function obtenerEstadoCuenta(query: string): Promise<EstadoCuenta> {
  const { data } = await api.get(`/pagos/${query}`);
  return data;
}

// ─── MercadoPago checkout ─────────────────────────────────────────────────────

export interface CheckoutMPResult {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  is_sandbox: boolean;
}

export async function crearCheckoutMP(postulacionId: number): Promise<CheckoutMPResult> {
  const { data } = await api.post("/pagos/checkout", { postulacionId });
  return data;
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
}): Promise<{ data: PostulacionBandejaItem[]; total: number; page: number; totalPages: number }> {
  const { data } = await api.get("/revisor/bandeja", { params });
  return data;
}

export async function getPostulacionDetalle(id: number): Promise<PostulacionDetalle> {
  const { data } = await api.get(`/postulantes/${id}`);
  return data;
}

export async function aprobarPostulacion(
  id: number,
  carreraId: number
): Promise<{ codigoCIP: string }> {
  const { data } = await api.post(`/revisor/${id}/aprobar`, { carreraId });
  return { codigoCIP: data.codigo };
}

export async function observarPostulacion(
  id: number,
  mensaje: string,
  revisorId: number,
  camposObservados: string[]
): Promise<void> {
  await api.post(`/revisor/${id}/observar`, { mensaje, revisorId, camposObservados });
}

// ─── Subsanación por token ────────────────────────────────────────────────────

export async function obtenerSubsanacionPorToken(token: string): Promise<PostulacionDetalle> {
  const { data } = await api.get(`/subsanacion/${token}`);
  return data;
}

export async function procesarSubsanacion(
  token: string,
  body: { fotoUrl?: string; tituloUrl?: string; voucherUrl?: string }
): Promise<void> {
  await api.patch(`/subsanacion/${token}`, body);
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
