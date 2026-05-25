"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { getExpedientes, type PostulacionBandejaItem } from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

type EstadoBadge = {
  label: string;
  bg: string;
  text: string;
  border: string;
};

const ESTADO_BADGE: Record<string, EstadoBadge> = {
  PENDIENTE: {
    label: "Nuevo",
    bg: "bg-surface-container-high",
    text: "text-on-surface",
    border: "border-outline-variant",
  },
  OBSERVADO: {
    label: "Observado",
    bg: "bg-status-observado-bg",
    text: "text-status-observado-text",
    border: "border-[#FDBA74]",
  },
  SUBSANADO: {
    label: "Corregido",
    bg: "bg-[#DBEAFE]",
    text: "text-[#1E40AF]",
    border: "border-[#BFDBFE]",
  },
  APROBADO: {
    label: "Admitido",
    bg: "bg-status-aprobado-bg",
    text: "text-status-aprobado-text",
    border: "border-[#6EE7B7]",
  },
  RECHAZADO: {
    label: "Rechazado",
    bg: "bg-status-rechazado-bg",
    text: "text-status-rechazado-text",
    border: "border-[#FCA5A5]",
  },
};

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Bandeja de Expedientes ────────────────────────────────────────────────────

export default function RevisorPage() {
  const [expedientes, setExpedientes] = useState<PostulacionBandejaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const result = await getExpedientes({ search, page });
      setExpedientes(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setExpedientes([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setCargando(false);
    }
  }, [search, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Barra superior */}
      <header className="bg-surface-container-lowest border-b border-outline-variant px-lg py-md flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-md">
          <h1 className="font-headline-md text-headline-md text-on-surface">Bandeja de Expedientes</h1>
          <div className="h-6 w-px bg-outline-variant" />
          <div className="flex items-center gap-sm bg-surface-container-low px-md py-1 rounded-lg border border-outline-variant">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
              location_on
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Sede:</span>
            <span className="font-label-sm text-label-sm font-semibold text-on-surface">La Libertad</span>
          </div>
        </div>
        <form onSubmit={handleSearch}>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
              search
            </span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por DNI o Nombre..."
              className="pl-10 pr-4 py-2 w-64 bg-surface-container-low border border-outline-variant rounded-lg font-body-base text-body-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
            />
          </div>
        </form>
      </header>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto p-lg">
        <div className="max-w-container-admin mx-auto flex flex-col gap-md">
          {cargando ? (
            <div className="flex items-center justify-center py-xl gap-md text-on-surface-variant text-[15px]">
              <Spinner />
              Cargando expedientes...
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-md py-sm font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider">
                      DNI
                    </th>
                    <th className="px-md py-sm font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider">
                      Nombre del Postulante
                    </th>
                    <th className="px-md py-sm font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider hidden md:table-cell">
                      Carrera / Región
                    </th>
                    <th className="px-md py-sm font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider hidden lg:table-cell">
                      Fecha de Ingreso
                    </th>
                    <th className="px-md py-sm font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-md py-sm font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {expedientes.map((exp) => {
                    const badge = ESTADO_BADGE[exp.estado] ?? ESTADO_BADGE.PENDIENTE;
                    const puedeRevisar =
                      exp.estado === "PENDIENTE" || exp.estado === "SUBSANADO";

                    return (
                      <tr
                        key={exp.id}
                        className="hover:bg-surface-container transition-colors"
                      >
                        <td className="px-md py-md font-body-medium text-body-medium text-on-surface">
                          {exp.dni}
                        </td>
                        <td className="px-md py-md font-body-base text-body-base text-on-surface">
                          {exp.nombres} {exp.apellidoPaterno} {exp.apellidoMaterno}
                        </td>
                        <td className="px-md py-md hidden md:table-cell">
                          <div className="font-label-sm text-label-sm text-on-surface-variant">
                            {exp.carrera ? `Ing. ${exp.carrera.nombre}` : "Sin asignar"}
                          </div>
                          <div className="font-label-sm text-label-sm text-on-surface-variant/70">
                            {exp.region.nombre}
                          </div>
                        </td>
                        <td className="px-md py-md font-body-base text-body-base text-on-surface-variant hidden lg:table-cell">
                          {formatFecha(exp.creadoEn)}
                        </td>
                        <td className="px-md py-md">
                          <span
                            className={`inline-flex items-center px-sm py-unit rounded-md font-label-sm text-label-sm font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-md py-md text-right">
                          {puedeRevisar ? (
                            <Link
                              href={`/revisor/auditoria/${exp.id}`}
                              className="text-primary hover:text-primary-container font-body-medium text-body-medium flex items-center justify-end gap-unit transition-colors"
                            >
                              Revisar
                              <span className="material-symbols-outlined text-[18px]">
                                chevron_right
                              </span>
                            </Link>
                          ) : exp.estado === "APROBADO" ? (
                            <Link
                              href={`/revisor/auditoria/${exp.id}`}
                              className="text-secondary hover:text-on-surface font-body-medium text-body-medium flex items-center justify-end gap-unit transition-colors"
                            >
                              Ver Detalle
                              <span className="material-symbols-outlined text-[18px]">
                                visibility
                              </span>
                            </Link>
                          ) : (
                            <span className="text-on-surface-variant font-body-medium text-body-medium px-md">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {expedientes.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-md py-xl text-center text-on-surface-variant font-body-base text-body-base"
                      >
                        No se encontraron expedientes{search ? ` para "${search}"` : ""}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Paginación */}
              <div className="bg-surface-container-low border-t border-outline-variant px-md py-sm flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Mostrando {expedientes.length} de {total} expedientes
                </span>
                <div className="flex items-center gap-xs">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-xs text-on-surface-variant hover:bg-surface-container rounded transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-xl">chevron_left</span>
                  </button>

                  {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`px-sm py-unit font-label-sm text-label-sm rounded transition-colors ${
                        n === page
                          ? "bg-primary text-on-primary font-semibold"
                          : "text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      {n}
                    </button>
                  ))}

                  {totalPages > 3 && (
                    <span className="px-sm text-on-surface-variant text-[13px]">...</span>
                  )}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-xs text-on-surface-variant hover:bg-surface-container rounded transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-xl">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
