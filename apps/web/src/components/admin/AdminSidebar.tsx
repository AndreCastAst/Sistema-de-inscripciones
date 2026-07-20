"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getNombre, getRol, getRegionNombre, logout } from "@/lib/auth";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const nombre = getNombre() ?? "Administrador";
  const rol = getRol();
  const regionNombre = getRegionNombre();
  const esCajero = rol === "cajero";
  const iniciales = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join("");

  function handleLogout() {
    logout();
    router.replace("/revisor/login");
  }

  const navItem = (href: string, icon: string, label: string) => {
    const activo =
      href === "/revisor"
        ? pathname === "/revisor"
        : pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={`mx-sm px-md py-sm rounded-lg text-[15px] flex items-center gap-md transition-all active:scale-[0.98] ${
          activo
            ? "bg-primary-container text-on-primary-container font-semibold"
            : "text-on-surface-variant hover:bg-secondary-container font-medium"
        }`}
      >
        <span
          className="material-symbols-outlined"
          style={activo ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          {icon}
        </span>
        {label}
      </Link>
    );
  };

  return (
    <nav className="h-screen w-64 fixed left-0 top-0 bg-surface-container border-r border-outline-variant flex flex-col gap-xs py-lg z-20">
      {/* Cabecera */}
      <div className="px-lg pb-md mb-sm border-b border-outline-variant">
        <div className="flex items-center gap-md">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center border-2 border-outline-variant shrink-0">
            <span className="text-on-primary font-bold text-sm">{iniciales || "AD"}</span>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-primary">{nombre}</h2>
            <p className="text-[13px] text-on-surface-variant">
              {esCajero ? "Cajero" : "Administrador"} · {regionNombre}
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-unit px-sm">
        {!esCajero && navItem("/revisor", "folder_shared", "Bandeja de Expedientes")}
        {!esCajero && navItem("/revisor/auditoria", "fact_check", "Auditoría Documental")}
        {!esCajero && navItem("/revisor/subsanacion", "upload_file", "Subsanación Presencial")}
        {esCajero && navItem("/revisor/ventanilla", "point_of_sale", "Módulo de Ventanilla")}
      </div>

      {/* Footer */}
      <div className="mt-auto px-sm flex flex-col gap-unit pt-md border-t border-outline-variant">
        <button
          onClick={handleLogout}
          className="mx-sm px-md py-sm rounded-lg text-[15px] font-medium flex items-center gap-md transition-all hover:bg-secondary-container w-full text-left"
        >
          <span className="material-symbols-outlined text-error">logout</span>
          <span className="text-error">Cerrar Sesión</span>
        </button>
      </div>
    </nav>
  );
}
