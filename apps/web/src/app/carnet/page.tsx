"use client";

import { useState } from "react";
import { NavBar } from "@/components/ui/NavBar";
import { Spinner } from "@/components/ui/Spinner";
import { buscarColegiado } from "@/lib/api";
import type { CarnetData } from "@/types";

// ── Tarjeta de carnet física ──────────────────────────────────────────────────

function TarjetaCarnet({ datos }: { datos: CarnetData }) {
  const inhabilitado = datos.inhabilitado;
  const nombreCompleto = `${datos.apellidoPaterno} ${datos.apellidoMaterno} ${datos.nombres}`;

  return (
    <div className="relative w-[480px] h-[320px] bg-white rounded-lg border border-outline-variant overflow-hidden shadow-md flex flex-col shrink-0 select-none font-sans">
      {/* Franja negra superior */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-[#1a1a1a]" />
      {/* Línea dorada */}
      <div className="absolute top-2 left-0 right-0 h-[3px] bg-[#C9A84C]" />

      {/* Cabecera: logo + nombre institución */}
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

      {/* Cuerpo: foto + detalles */}
      <div className="mt-20 px-8 flex gap-6 items-start">
        {/* Foto */}
        <div className="w-[110px] h-[155px] border border-gray-300 overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
          {datos.fotoUrl ? (
            <img
              src={datos.fotoUrl}
              alt={nombreCompleto}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-gray-400 text-5xl">person</span>
          )}
        </div>

        {/* Detalles del colegiado */}
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
          <div className="text-[13px] font-medium text-black mt-2 normal-case">
            Ing. {datos.carrera.nombre.toUpperCase()}
          </div>
          <div className="text-[13px] font-medium text-black normal-case">
            <span className="font-black">DNI:</span> {datos.dni}
          </div>
        </div>
      </div>

      {/* Número de registro (pie) */}
      <div className="absolute bottom-4 right-6 text-[18px] font-black text-black">
        Nº Reg. CIP: {datos.codigo}
      </div>

      {/* Marca de agua si está inhabilitado */}
      {inhabilitado && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-20 mix-blend-multiply">
          <div className="text-red-500 opacity-20 font-black text-[48px] uppercase tracking-widest -rotate-[30deg] border-4 border-red-500 px-md py-sm scale-150">
            INHABILITADO
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tabla de deuda ────────────────────────────────────────────────────────────

function TablaDeuda({ datos }: { datos: CarnetData }) {
  // En una implementación real, las mensualidades vendrían incluidas en CarnetData.
  // Por ahora mostramos el estado general.
  const inhabilitado = datos.inhabilitado;

  return (
    <div className="flex flex-col gap-lg w-full">
      {/* Banner de estado */}
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
            Estado Actual:{" "}
            {inhabilitado ? "Inhabilitado" : "Habilitado"}
          </h3>
          <p className="text-[15px] text-on-surface-variant mt-xs">
            {inhabilitado
              ? "El colegiado se encuentra inhabilitado para el ejercicio profesional debido a deudas en sus cuotas institucionales."
              : "El colegiado se encuentra habilitado para el ejercicio profesional."}
          </p>
        </div>
      </div>

      {/* Datos del colegiado */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
        <div className="bg-surface border-b border-outline-variant px-lg py-md flex items-center gap-md">
          <div className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">person</span>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-on-surface">
              {datos.nombres} {datos.apellidoPaterno} {datos.apellidoMaterno}
            </p>
            <p className="text-[13px] text-on-surface-variant">
              CIP: {datos.codigo} | Ing. {datos.carrera.nombre} | {datos.region.nombre}
            </p>
          </div>
        </div>

        {inhabilitado && (
          <div className="p-lg">
            <p className="text-[13px] text-on-surface-variant mb-md">
              Para regularizar tu estado, realiza el pago de las cuotas pendientes.
            </p>
            <div className="flex flex-col sm:flex-row gap-md justify-end">
              <button className="w-full sm:w-auto h-[48px] px-lg rounded flex items-center justify-center gap-sm text-[15px] font-semibold bg-surface-container-lowest text-on-surface hover:bg-surface-dim transition-colors border border-outline-variant">
                <span className="material-symbols-outlined text-xl">download</span>
                Estado de Cuenta
              </button>
              <button className="w-full sm:w-auto h-[48px] px-xl rounded flex items-center justify-center gap-sm text-[15px] font-semibold bg-primary text-on-primary hover:brightness-110 transition-all shadow-sm">
                <span className="material-symbols-outlined text-xl">credit_card</span>
                Pagar en Línea
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ConsultaCarnetPage() {
  const [query, setQuery] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<CarnetData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    const q = query.trim();
    if (!q) return;
    setBuscando(true);
    setError(null);
    setResultado(null);
    try {
      const datos = await buscarColegiado(q);
      setResultado(datos);
    } catch {
      setError("No se encontró ningún colegiado con el DNI o código CIP ingresado.");
    } finally {
      setBuscando(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") buscar();
  }

  return (
    <>
      <NavBar activeTab="carnet" />
      <main className="flex-grow w-full max-w-container-admin mx-auto px-md md:px-lg py-xl flex flex-col gap-xl">
        {/* Buscador */}
        <section className="w-full max-w-container-max-form mx-auto">
          <div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant flex flex-col gap-md">
            <h1 className="text-[20px] font-semibold text-on-surface">
              Consulta de Estado y Habilidad
            </h1>
            <p className="text-[15px] text-on-surface-variant">
              Ingrese su DNI o Código CIP para verificar el estado actual y visualizar su carnet
              digital.
            </p>
            <div className="flex flex-col sm:flex-row gap-sm mt-sm">
              <div className="relative flex-grow">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-secondary-fixed-dim">
                  search
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Número de DNI o Código CIP"
                  className="w-full h-[48px] pl-[48px] pr-md bg-surface-bright border border-outline-variant rounded focus:border-primary focus:border-2 outline-none transition-all text-[15px] text-on-surface placeholder:text-secondary-fixed-dim"
                />
              </div>
              <button
                onClick={buscar}
                disabled={buscando || !query.trim()}
                className="h-[48px] px-xl rounded flex items-center justify-center gap-sm text-[15px] font-semibold bg-primary text-on-primary hover:brightness-110 transition-all shrink-0 disabled:opacity-60"
              >
                {buscando && <Spinner />}
                Buscar
              </button>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="max-w-container-max-form mx-auto w-full bg-error-container border border-error/20 text-error rounded-xl px-lg py-md flex items-center gap-md">
            <span className="material-symbols-outlined">search_off</span>
            {error}
          </div>
        )}

        {/* Resultados */}
        {resultado && (
          <section className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-xl items-start">
            {/* Columna izquierda: carnet */}
            <div className="flex flex-col gap-sm items-center lg:items-start w-full lg:w-auto">
              <h2 className="text-[15px] font-semibold text-on-surface px-sm">
                Vista Previa de Carnet
              </h2>
              <div className="overflow-x-auto max-w-full">
                <TarjetaCarnet datos={resultado} />
              </div>
              {resultado.inhabilitado && (
                <div className="text-[13px] text-on-surface-variant text-center w-full max-w-[480px] mt-xs flex items-center justify-center gap-xs">
                  <span className="material-symbols-outlined text-base text-primary">info</span>
                  El carnet digital no es válido mientras mantenga estado inhabilitado.
                </div>
              )}
            </div>

            {/* Columna derecha: estado y pago */}
            <TablaDeuda datos={resultado} />
          </section>
        )}

        {/* Estado vacío inicial */}
        {!resultado && !error && !buscando && (
          <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
            <span className="material-symbols-outlined text-outline" style={{ fontSize: "48px" }}>
              badge
            </span>
            <p className="text-[15px] text-on-surface-variant max-w-xs">
              Ingresa tu DNI o código CIP en el buscador para ver tu carnet y estado de habilidad.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
