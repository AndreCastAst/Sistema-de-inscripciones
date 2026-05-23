import axios from "axios";
import type {
  DatosDNI,
  Region,
  Carrera,
  FormInscripcionCompleto,
  Postulacion,
  CarnetData,
} from "@/types";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
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
