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

  // localStorage solo existe en el cliente; hasta montar mostramos el spinner.
  useEffect(() => {
    setMontado(true);
  }, []);

  const esLogin = pathname === "/revisor/login";

  // Decisión de acceso recalculada en CADA render (sin estado "pegajoso"):
  // el rol vigente y la ruta actual mandan siempre.
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
  }, [montado, esLogin, autenticado, rol, pathname, router]);

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
