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

// Claims que el backend firma dentro del JWT
interface JwtPayload {
  id: number;
  username: string;
  nombre: string;
  rol: string;
  regionId: number | null;
  exp?: number;
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

// Decodifica el payload del JWT (sin verificar la firma; eso lo hace el backend).
// Es la FUENTE ÚNICA DE VERDAD para rol/región: así el rol siempre coincide
// con el token con el que realmente estás autenticado, y no puede quedar
// desincronizado con una clave suelta de localStorage de una versión anterior.
function decodeToken(): JwtPayload | null {
  const token = getToken();
  if (!token) return null;
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getNombre(): string | null {
  const payload = decodeToken();
  if (payload?.nombre) return payload.nombre;
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NOMBRE_KEY);
}

export function getRol(): string | null {
  const payload = decodeToken();
  if (payload?.rol) return payload.rol;
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROL_KEY);
}

export function getRegion(): { id: number | null; nombre: string | null } | null {
  // El id de región viene del token (autoritativo); el nombre solo está en
  // localStorage porque no se firma en el JWT.
  const payload = decodeToken();
  let nombre: string | null = null;
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(REGION_KEY);
    if (raw) {
      try {
        nombre = (JSON.parse(raw) as { nombre: string | null }).nombre ?? null;
      } catch {
        nombre = null;
      }
    }
  }
  if (payload) return { id: payload.regionId ?? null, nombre };
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
  const token = getToken();
  if (!token) return false;
  // Si el token trae expiración y ya venció, se considera no autenticado
  // (el guardia lo mandará al login, nunca a otra pantalla de rol).
  const payload = decodeToken();
  if (payload?.exp && payload.exp * 1000 < Date.now()) return false;
  return true;
}
