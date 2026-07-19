import axios from "axios";

const TOKEN_KEY = "cip_admin_token";
const NOMBRE_KEY = "cip_admin_nombre";
const ROL_KEY = "cip_admin_rol";
const REGION_KEY = "cip_admin_region";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface LoginResponse {
  token: string;
  nombre: string;
  rol: string;
  regionId: number | null;
  regionNombre: string | null;
}

export async function loginAdmin(username: string, password: string): Promise<void> {
  const { data } = await axios.post<LoginResponse>(`${BASE_URL}/auth/login`, { username, password });
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(NOMBRE_KEY, data.nombre);
    localStorage.setItem(ROL_KEY, data.rol);
    localStorage.setItem(REGION_KEY, JSON.stringify({ id: data.regionId, nombre: data.regionNombre }));
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getNombre(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NOMBRE_KEY);
}

export function getRol(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROL_KEY);
}

export function getRegion(): { id: number | null; nombre: string | null } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(REGION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isSuperAdmin(): boolean {
  return getRol() === "admin" && getRegion()?.id === null;
}

export function getRegionNombre(): string {
  const region = getRegion();
  if (region?.nombre) return region.nombre;
  return isSuperAdmin() ? "Todas las sedes" : "—";
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NOMBRE_KEY);
    localStorage.removeItem(ROL_KEY);
    localStorage.removeItem(REGION_KEY);
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
