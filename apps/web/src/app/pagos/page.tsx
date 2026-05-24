"use client";

import { useState } from "react";
import { NavBar } from "@/components/ui/NavBar";
import { Spinner } from "@/components/ui/Spinner";
import { obtenerEstadoCuenta, type EstadoCuenta } from "@/lib/api";

type MetodoPago = "online" | "voucher";

function formatPeriodo(periodo: string): string {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const [anio, mes] = periodo.split("-");
  return `${meses[parseInt(mes) - 1]} ${anio}`;
}

export default function PagosPage() {
  const [query, setQuery] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [cuenta, setCuenta] = useState<EstadoCuenta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("online");
  const [procesando, setProcesando] = useState(false);

  async function buscar() {
    const q = query.trim();
    if (!q) return;
    setBuscando(true);
    setError(null);
    setCuenta(null);
    try {
      const datos = await obtenerEstadoCuenta(q);
      setCuenta(datos);
    } catch {
      setError("No se encontró ningún colegiado con el DNI o código CIP ingresado.");
    } finally {
      setBuscando(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") buscar();
  }

  async function procesarPago() {
    if (!cuenta) return;
    setProcesando(true);
    // En producción: redirigir a pasarela o mostrar formulario de voucher
    await new Promise((r) => setTimeout(r, 1500));
    setProcesando(false);
    alert("Redirigiendo a la pasarela de pagos...");
  }

  const cuotasPendientes =
    cuenta?.mensualidades.filter((m) => m.pagadoEn === null) ?? [];

  return (
    <>
      <NavBar activeTab="pagos" />
      <main className="flex-grow w-full max-w-container-admin mx-auto px-md md:px-lg py-xl">
        <div className="flex-grow max-w-4xl mx-auto w-full flex flex-col gap-xl">
          {/* Cabecera */}
          <div>
            <h1 className="text-[32px] font-bold text-on-surface mb-sm leading-[40px] tracking-tight">
              Consulta y Pago de Cuotas
            </h1>
            <p className="text-[15px] text-on-surface-variant">
              Ingrese su número de DNI o código CIP para consultar sus cuotas ordinarias
              pendientes.
            </p>
          </div>

          {/* Buscador */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <div className="flex flex-col md:flex-row gap-md items-end">
              <div className="flex-grow w-full">
                <label className="block text-[15px] font-medium text-on-surface mb-xs">
                  Documento de Identidad o Código CIP
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-secondary">
                    search
                  </span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ej. 12345678 o 000000"
                    className="w-full pl-xl pr-sm py-sm border border-outline-variant rounded-lg bg-surface focus:ring-2 focus:ring-primary focus:border-primary text-on-surface transition-all text-[15px] outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={buscar}
                disabled={buscando || !query.trim()}
                className="w-full md:w-auto bg-primary text-on-primary text-[15px] font-semibold px-lg py-sm h-[42px] rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-sm shadow-sm disabled:opacity-60"
              >
                {buscando && <Spinner />}
                Buscar
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-error-container border border-error/20 text-error rounded-xl px-lg py-md flex items-center gap-md text-[15px]">
              <span className="material-symbols-outlined">search_off</span>
              {error}
            </div>
          )}

          {/* Estado de cuenta */}
          {cuenta && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              {/* Cabecera */}
              <div className="bg-surface-container-low px-lg py-md border-b border-outline-variant flex justify-between items-center">
                <h2 className="text-[20px] font-semibold text-on-surface">Estado de Cuenta</h2>
                {cuotasPendientes.length > 0 ? (
                  <span className="bg-status-pendiente-bg text-status-pendiente-text px-sm py-xs rounded-full text-[13px] font-semibold flex items-center gap-xs">
                    <span className="material-symbols-outlined text-base">warning</span>
                    Pendiente
                  </span>
                ) : (
                  <span className="bg-status-aprobado-bg text-status-aprobado-text px-sm py-xs rounded-full text-[13px] font-semibold flex items-center gap-xs">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    Al día
                  </span>
                )}
              </div>

              <div className="p-lg">
                {/* Info del colegiado */}
                <div className="flex items-center gap-md mb-lg p-md bg-surface-bright rounded-lg border border-surface-dim">
                  <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-full text-primary">
                    <span className="material-symbols-outlined text-2xl">person</span>
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-on-surface">
                      Ing.{" "}
                      {cuenta.colegiado.nombres} {cuenta.colegiado.apellidoPaterno}{" "}
                      {cuenta.colegiado.apellidoMaterno}
                    </div>
                    <div className="text-[13px] text-on-surface-variant">
                      CIP: {cuenta.colegiado.codigo} | Ing.{" "}
                      {cuenta.colegiado.carrera.nombre}
                    </div>
                  </div>
                </div>

                {cuotasPendientes.length === 0 ? (
                  <div className="text-center py-lg text-on-surface-variant text-[15px]">
                    <span
                      className="material-symbols-outlined text-status-aprobado-text"
                      style={{ fontSize: "48px", fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                    <p className="mt-md">No tienes cuotas pendientes. ¡Estás al día!</p>
                  </div>
                ) : (
                  <>
                    {/* Tabla de cuotas */}
                    <div className="overflow-x-auto rounded-lg border border-outline-variant mb-lg">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low border-b border-outline-variant">
                            <th className="px-md py-sm text-[15px] font-semibold text-on-surface">
                              Concepto
                            </th>
                            <th className="px-md py-sm text-[15px] font-semibold text-on-surface">
                              Periodo
                            </th>
                            <th className="px-md py-sm text-[15px] font-semibold text-on-surface text-right">
                              Monto
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                          {cuotasPendientes.map((m) => (
                            <tr
                              key={m.id}
                              className="hover:bg-surface-bright transition-colors"
                            >
                              <td className="px-md py-sm text-[15px] text-on-surface">
                                Cuota Ordinaria
                              </td>
                              <td className="px-md py-sm text-[15px] text-on-surface-variant">
                                {formatPeriodo(m.periodo)}
                              </td>
                              <td className="px-md py-sm text-[15px] font-semibold text-on-surface text-right tabular-nums">
                                S/ {m.monto.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-surface-container-low border-t-2 border-outline-variant">
                          <tr>
                            <td
                              className="px-md py-sm text-[15px] font-semibold text-on-surface text-right"
                              colSpan={2}
                            >
                              Total a Pagar:
                            </td>
                            <td className="px-md py-sm text-[20px] font-semibold text-primary text-right tabular-nums">
                              S/ {cuenta.totalDeuda.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Método de pago */}
                    <h3 className="text-[15px] font-semibold text-on-surface mb-md">
                      Método de Pago
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg">
                      <label className="cursor-pointer">
                        <input
                          type="radio"
                          name="payment_method"
                          value="online"
                          checked={metodoPago === "online"}
                          onChange={() => setMetodoPago("online")}
                          className="peer sr-only"
                        />
                        <div className="h-full border-2 border-outline-variant rounded-xl p-md flex flex-col items-center justify-center text-center hover:border-primary-container peer-checked:border-primary peer-checked:bg-error-container/20 transition-all">
                          <span className="material-symbols-outlined text-primary text-4xl mb-sm">
                            credit_card
                          </span>
                          <div className="text-[15px] font-semibold text-on-surface">
                            Pagar en Línea
                          </div>
                          <div className="text-[13px] text-on-surface-variant mt-xs">
                            Tarjeta de crédito o débito (Culqi)
                          </div>
                        </div>
                      </label>

                      <label className="cursor-pointer">
                        <input
                          type="radio"
                          name="payment_method"
                          value="voucher"
                          checked={metodoPago === "voucher"}
                          onChange={() => setMetodoPago("voucher")}
                          className="peer sr-only"
                        />
                        <div className="h-full border-2 border-outline-variant rounded-xl p-md flex flex-col items-center justify-center text-center hover:border-primary-container peer-checked:border-primary peer-checked:bg-error-container/20 transition-all">
                          <span className="material-symbols-outlined text-secondary text-4xl mb-sm">
                            upload_file
                          </span>
                          <div className="text-[15px] font-semibold text-on-surface">
                            Subir Voucher
                          </div>
                          <div className="text-[13px] text-on-surface-variant mt-xs">
                            Transferencia bancaria o depósito
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Información del método seleccionado */}
                    <div className="bg-surface-bright p-md border border-outline-variant rounded-lg mb-lg">
                      <div className="flex items-start gap-sm text-[13px] text-on-surface-variant">
                        <span className="material-symbols-outlined text-xl text-primary shrink-0">
                          info
                        </span>
                        {metodoPago === "online"
                          ? "Será redirigido a la pasarela de pagos segura. El cargo se realizará por el monto total mostrado."
                          : "Sube el comprobante de tu depósito o transferencia bancaria. El área administrativa lo validará en 24-48 horas hábiles."}
                      </div>
                    </div>

                    {/* Botón de acción */}
                    <div className="flex justify-end pt-md border-t border-outline-variant">
                      <button
                        type="button"
                        onClick={procesarPago}
                        disabled={procesando}
                        className="bg-primary text-on-primary text-[17px] font-semibold px-xl py-sm rounded-lg hover:brightness-110 transition-all flex items-center gap-sm shadow-md disabled:opacity-60"
                      >
                        {procesando && <Spinner />}
                        {procesando
                          ? "Procesando..."
                          : metodoPago === "online"
                          ? `Procesar Pago S/ ${cuenta.totalDeuda.toFixed(2)}`
                          : "Subir Comprobante"}
                        {!procesando && (
                          <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Estado vacío */}
          {!cuenta && !error && !buscando && (
            <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
              <span
                className="material-symbols-outlined text-outline"
                style={{ fontSize: "48px" }}
              >
                payments
              </span>
              <p className="text-[15px] text-on-surface-variant max-w-xs">
                Ingresa tu DNI o código CIP para consultar tus cuotas pendientes y realizar el
                pago.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
