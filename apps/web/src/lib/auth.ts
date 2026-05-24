import axios from "axios";

const TOKEN_KEY = "cip_admin_token";
const NOMBRE_KEY = "cip_admin_nombre";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export async function loginAdmin(username: string, password: string): Promise<void> {
  const { data } = await axios.post(`${BASE_URL}/auth/login`, { username, password });
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(NOMBRE_KEY, data.nombre);
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

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NOMBRE_KEY);
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
