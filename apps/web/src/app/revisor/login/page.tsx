"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAdmin, getRol } from "@/lib/auth";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginAdmin(username, password);
      router.replace(getRol() === "cajero" ? "/revisor/ventanilla" : "/revisor");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Credenciales incorrectas"
        : "Error de conexión. Intente nuevamente.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      {/* Botón volver al portal */}
      <Link
        href="/"
        className="absolute top-5 left-5 flex items-center gap-1.5 text-[14px] font-medium text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        Portal Público
      </Link>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <span className="text-on-primary font-bold text-xl select-none">CIP</span>
          </div>
          <div className="text-center">
            <h1 className="text-[22px] font-bold text-primary">Acceso Administrativo</h1>
            <p className="text-[14px] text-on-surface-variant mt-1">
              Sistema de Inscripciones – CIP
            </p>
          </div>
        </div>

        {/* Tarjeta */}
        <div className="bg-surface border border-outline-variant rounded-2xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Usuario */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-on-surface-variant uppercase tracking-wide">
                Usuario
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                  person
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  placeholder="Ingrese su usuario"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant bg-surface-container text-on-surface text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-on-surface-variant uppercase tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                  lock
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Ingrese su contraseña"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant bg-surface-container text-on-surface text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-error-container text-on-error-container rounded-lg px-4 py-3 text-[14px]">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full py-3 rounded-xl bg-primary text-on-primary font-semibold text-[15px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Verificando…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Ingresar
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-on-surface-variant mt-6">
          Solo personal autorizado del CIP
        </p>
      </div>
    </div>
  );
}
