"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { isAuthenticated, getRol } from "@/lib/auth";

// Ruta de inicio según el rol
function rutaInicio(rol: string | null): string {
  return rol === "cajero" ? "/revisor/ventanilla" : "/revisor";
}

// ¿El rol tiene permitido estar en esta ruta?
function rutaPermitida(rol: string | null, pathname: string): boolean {
  const enVentanilla =
    pathname === "/revisor/ventanilla" || pathname.startsWith("/revisor/ventanilla/");
  // El cajero solo puede estar en la ventanilla; el administrador en todo lo demás.
  return rol === "cajero" ? enVentanilla : !enVentanilla;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [montado, setMontado] = useState(false);
  // Se incrementa cuando la sesión cambia en otra pestaña, para forzar
  // que el guardia reevalúe el rol vigente sin esperar a una navegación.
  const [sesionVersion, setSesionVersion] = useState(0);

  // localStorage solo existe en el cliente; hasta montar mostramos el spinner.
  useEffect(() => {
    setMontado(true);
  }, []);

  // Sincronización entre pestañas: si el token/rol cambia en otra pestaña
  // (p. ej. inicias sesión con otro usuario), esta pestaña se entera al instante.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === null || e.key.startsWith("cip_admin_")) {
        setSesionVersion((v) => v + 1);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const esLogin = pathname === "/revisor/login";

  // Decisión de acceso recalculada en CADA render (sin estado "pegajoso"):
  // el rol vigente y la ruta actual mandan siempre. sesionVersion fuerza la
  // reevaluación cuando la sesión cambió en otra pestaña.
  void sesionVersion;
  const autenticado = montado && isAuthenticated();
  const rol = montado ? getRol() : null;
  const permitido = esLogin || (autenticado && rutaPermitida(rol, pathname));

  useEffect(() => {
    if (!montado || esLogin) return;
    if (!autenticado) {
      router.replace("/revisor/login");
      return;
    }
    if (!rutaPermitida(rol, pathname)) {
      router.replace(rutaInicio(rol));
    }
  }, [montado, esLogin, autenticado, rol, pathname, router, sesionVersion]);

  if (esLogin) {
    return <>{children}</>;
  }

  // Nunca renderizamos el contenido si el rol no corresponde a la ruta:
  // así el usuario jamás ve —ni por un instante— la pantalla del rol equivocado.
  if (!permitido) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <AdminSidebar />
      <main className="ml-64 flex-1 flex flex-col h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}
