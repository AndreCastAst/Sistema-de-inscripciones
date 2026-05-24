"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { NavBar } from "@/components/ui/NavBar";
import { Spinner } from "@/components/ui/Spinner";
import { obtenerCarnet } from "@/lib/api";
import type { CarnetData } from "@/types";

interface Props {
  params: { codigo: string };
}

export default function CarnetPage({ params }: Props) {
  const [datos, setDatos] = useState<CarnetData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerCarnet(params.codigo)
      .then(setDatos)
      .catch(() => setError("No se encontró el carnet con el código proporcionado."))
      .finally(() => setCargando(false));
  }, [params.codigo]);

  if (cargando) {
    return (
      <>
        <NavBar activeTab="carnet" />
        <main className="flex-grow flex items-center justify-center py-xl">
          <div className="flex items-center gap-md text-on-surface-variant text-[15px]">
            <Spinner />
            Cargando carnet...
          </div>
        </main>
      </>
    );
  }

  if (error || !datos) {
    return (
      <>
        <NavBar activeTab="carnet" />
        <main className="flex-grow flex flex-col items-center justify-center py-xl gap-md text-center px-md">
          <span className="material-symbols-outlined text-outline" style={{ fontSize: "56px" }}>
            search_off
          </span>
          <h2 className="text-[20px] font-semibold text-on-surface">Carnet no encontrado</h2>
          <p className="text-[15px] text-on-surface-variant max-w-xs">
            {error ?? "No se encontró información para este código."}
          </p>
          <Link
            href="/carnet"
            className="bg-primary text-on-primary px-lg py-2.5 rounded-lg text-[15px] font-semibold hover:brightness-110 transition-all"
          >
            Ir a Consulta de Carnet
          </Link>
        </main>
      </>
    );
  }

  const inhabilitado = datos.inhabilitado;
  const nombreCompleto = `${datos.nombres} ${datos.apellidoPaterno} ${datos.apellidoMaterno}`;

  return (
    <>
      <NavBar activeTab="carnet" />
      <main className="flex-grow py-xl px-md md:px-lg">
        <div className="max-w-container-admin mx-auto">
          <div className="mb-lg">
            <Link
              href="/carnet"
              className="flex items-center gap-xs text-[15px] text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
              Volver a búsqueda
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-xl items-start">
            {/* Carnet */}
            <div className="flex flex-col gap-sm items-center lg:items-start">
              <h2 className="text-[15px] font-semibold text-on-surface px-sm">
                Vista Previa de Carnet
              </h2>
              <div className="relative w-[480px] h-[320px] bg-white rounded-lg border border-outline-variant overflow-hidden shadow-md flex flex-col shrink-0 select-none max-w-full">
                {/* Franja negra + dorada */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-[#1a1a1a]" />
                <div className="absolute top-2 left-0 right-0 h-[3px] bg-[#C9A84C]" />

                {/* Cabecera */}
                <div className="absolute top-4 left-0 right-0 px-4 py-1 flex items-center gap-3">
                  <div className="w-14 h-14 shrink-0 bg-[#002855] rounded-full flex items-center justify-center">
                    <span className="text-white font-black text-xl">CIP</span>
                  </div>
                  <div className="flex-grow text-center">
                    <div className="text-[#002855] font-black text-[18px] leading-tight uppercase">
                      Colegio de Ingenieros
                      <br />
                      del Perú
                    </div>
                  </div>
                </div>

                {/* Cuerpo */}
                <div className="mt-20 px-8 flex gap-6 items-start">
                  <div className="w-[110px] h-[155px] border border-gray-300 overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
                    {datos.fotoUrl ? (
                      <img
                        src={datos.fotoUrl}
                        alt={nombreCompleto}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-gray-400 text-5xl">
                        person
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 pt-2">
                    <div className="text-[18px] font-black text-black uppercase leading-tight">
                      {datos.apellidoPaterno}
                    </div>
                    <div className="text-[18px] font-black text-black uppercase leading-tight">
                      {datos.apellidoMaterno}
                    </div>
                    <div className="text-[18px] font-black text-black uppercase leading-tight">
                      {datos.nombres}
                    </div>
                    <div className="text-[13px] font-medium text-black mt-2">
                      Ing. {datos.carrera.nombre.toUpperCase()}
                    </div>
                    <div className="text-[13px] font-medium text-black">
                      <span className="font-black">DNI:</span> {datos.dni}
                    </div>
                  </div>
                </div>

                {/* Número de registro */}
                <div className="absolute bottom-4 right-6 text-[18px] font-black text-black">
                  Nº Reg. CIP: {datos.codigo}
                </div>

                {/* Marca de agua inhabilitado */}
                {inhabilitado && (
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-20 mix-blend-multiply">
                    <div className="text-red-500 opacity-20 font-black text-[48px] uppercase tracking-widest -rotate-[30deg] border-4 border-red-500 px-md py-sm scale-150">
                      INHABILITADO
                    </div>
                  </div>
                )}
              </div>

              {inhabilitado && (
                <p className="text-[13px] text-on-surface-variant text-center max-w-[480px] mt-xs flex items-center gap-xs">
                  <span className="material-symbols-outlined text-base text-primary">info</span>
                  El carnet digital no es válido mientras mantenga estado inhabilitado.
                </p>
              )}
            </div>

            {/* Estado y acciones */}
            <div className="flex flex-col gap-lg">
              <div
                className={`rounded-xl p-md flex items-start gap-md border ${
                  inhabilitado
                    ? "bg-status-rechazado-bg border-status-rechazado-text/20"
                    : "bg-status-aprobado-bg border-status-aprobado-text/20"
                }`}
              >
                <span
                  className={`material-symbols-outlined mt-xs ${
                    inhabilitado ? "text-status-rechazado-text" : "text-status-aprobado-text"
                  }`}
                >
                  {inhabilitado ? "error" : "check_circle"}
                </span>
                <div>
                  <h3
                    className={`text-[15px] font-semibold ${
                      inhabilitado ? "text-status-rechazado-text" : "text-status-aprobado-text"
                    }`}
                  >
                    Estado Actual: {inhabilitado ? "Inhabilitado" : "Habilitado"}
                  </h3>
                  <p className="text-[15px] text-on-surface-variant mt-xs">
                    {inhabilitado
                      ? "El colegiado se encuentra inhabilitado para el ejercicio profesional."
                      : "El colegiado está habilitado para el ejercicio profesional."}
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                <div className="bg-surface border-b border-outline-variant px-lg py-md">
                  <h3 className="text-[20px] font-semibold text-on-surface">
                    Información del Colegiado
                  </h3>
                </div>
                <div className="p-lg space-y-sm">
                  {[
                    { label: "Nombre completo", value: nombreCompleto },
                    { label: "DNI", value: datos.dni },
                    { label: "Código CIP", value: datos.codigo },
                    { label: "Especialidad", value: `Ing. ${datos.carrera.nombre}` },
                    { label: "Región", value: datos.region.nombre },
                    {
                      label: "Fecha de alta",
                      value: new Date(datos.fechaAlta).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }),
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-sm border-b border-outline-variant/50 last:border-0">
                      <span className="text-[13px] font-medium text-on-surface-variant">
                        {label}
                      </span>
                      <span className="text-[15px] text-on-surface font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                {inhabilitado && (
                  <div className="p-lg bg-surface border-t border-outline-variant flex flex-col sm:flex-row gap-md justify-end">
                    <Link
                      href="/pagos"
                      className="w-full sm:w-auto h-[48px] px-xl rounded flex items-center justify-center gap-sm text-[15px] font-semibold bg-primary text-on-primary hover:brightness-110 transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-xl">credit_card</span>
                      Ir a Pagos
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
