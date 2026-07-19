"use client";

import { useState, useRef } from "react";
import { NavBar } from "@/components/ui/NavBar";
import { Spinner } from "@/components/ui/Spinner";
import { buscarColegiado, obtenerEstadoCuenta, desglosarDeuda, api, type EstadoCuenta } from "@/lib/api";
import { subirPDF } from "@/lib/cloudinary";
import { SimuladorPago, type DatosPago } from "@/components/pagos/SimuladorPago";
import type { CarnetData } from "@/types";

// ── Tarjeta de carnet física ──────────────────────────────────────────────────

function TarjetaCarnet({ datos }: { datos: CarnetData }) {
  const inhabilitado = datos.inhabilitado;

  return (
    <div className="relative w-[480px] h-[320px] bg-white rounded-lg border border-outline-variant overflow-hidden shadow-md flex flex-col shrink-0 select-none font-sans">
      <div className="absolute top-0 left-0 right-0 h-2 bg-[#1a1a1a]" />
      <div className="absolute top-2 left-0 right-0 h-[3px] bg-[#C9A84C]" />

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

      <div className="mt-20 px-8 flex gap-6 items-start">
        <div className="w-[110px] h-[155px] border border-gray-300 overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
          {datos.fotoUrl ? (
            <img
              src={datos.fotoUrl}
              alt={`${datos.apellidoPaterno} ${datos.nombres}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-gray-400 text-5xl">person</span>
          )}
        </div>
        <div className="flex flex-col gap-1 pt-2">
          <div className="text-[18px] font-black text-black uppercase">{datos.apellidoPaterno}</div>
          <div className="text-[18px] font-black text-black uppercase">{datos.apellidoMaterno}</div>
          <div className="text-[18px] font-black text-black uppercase">{datos.nombres}</div>
          <div className="text-[14px] font-medium text-black mt-2">Ing. {datos.carrera.nombre.toUpperCase()}</div>
          <div className="text-[14px] font-medium text-black">
            <span className="font-black">DNI:</span> {datos.dni}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-6 text-[18px] font-black text-black">
        Nº Reg. CIP: {datos.codigo}
      </div>

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

// ── Panel de estado y pago ────────────────────────────────────────────────────

type MetodoPago = "online" | "voucher";

function PanelDeudaYPago({
  carnet,
  cuenta,
  onPagoExito,
}: {
  carnet: CarnetData;
  cuenta: EstadoCuenta | null;
  onPagoExito: () => void;
}) {
  const inhabilitado = carnet.inhabilitado;
  const cuotasPendientes = cuenta?.mensualidades.filter((m) => m.pagadoEn === null) ?? [];

  const [metodoPago, setMetodoPago] = useState<MetodoPago>("online");
  const [alcancePago, setAlcancePago] = useState<"vencidas" | "todas">("vencidas");
  const [mostrarSimulador, setMostrarSimulador] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [exitoPago, setExitoPago] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);

  const desglose = cuenta ? desglosarDeuda(cuenta) : null;
  const mostrarAlcance = !!desglose && desglose.vencidas.length > 0 && desglose.actual.length > 0;
  const soloVencidas = mostrarAlcance && alcancePago === "vencidas";
  const cuotasIncluidas = soloVencidas ? desglose!.vencidas : cuotasPendientes;
  const periodosAPagar = cuotasIncluidas.map((m) => m.periodo);
  const totalAPagar = !desglose ? 0 : soloVencidas ? desglose.totalSoloVencida : desglose.totalConActual;

  const voucherRef = useRef<HTMLInputElement>(null);
  const [voucherEstado, setVoucherEstado] = useState<"idle" | "subiendo" | "listo" | "error">("idle");
  const [voucherUrl, setVoucherUrl] = useState<string | null>(null);

  async function subirVoucher(file: File) {
    setVoucherEstado("subiendo");
    try {
      const url = await subirPDF(file);
      setVoucherUrl(url);
      setVoucherEstado("listo");
    } catch {
      setVoucherEstado("error");
    }
  }

  async function confirmarVoucher() {
    if (!voucherUrl || !cuenta) return;
    setProcesando(true);
    setErrorPago(null);
    try {
      for (const periodo of periodosAPagar) {
        await api.post("/pagos/mensualidad/voucher", {
          codigo: cuenta.colegiado.codigo,
          periodo,
          voucherUrl,
        });
      }
      setExitoPago(true);
      onPagoExito();
    } catch {
      setErrorPago("No se pudo registrar el comprobante. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  const datosPago: DatosPago | null = cuenta
    ? {
        tipo: "mensualidades",
        monto: totalAPagar,
        nombres: cuenta.colegiado.nombres,
        apellidoPaterno: cuenta.colegiado.apellidoPaterno,
        apellidoMaterno: cuenta.colegiado.apellidoMaterno,
        codigoCIP: cuenta.colegiado.codigo,
        carrera: cuenta.colegiado.carrera.nombre,
        periodos: periodosAPagar,
        codigo: cuenta.colegiado.codigo,
      }
    : null;

  function formatPeriodo(periodo: string): string {
    const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
      "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    const [anio, mes] = periodo.split("-");
    return `${meses[parseInt(mes) - 1]} ${anio}`;
  }

  // Agrupar cuotas incluidas (según alcance) por año
  const porAnio: Record<string, typeof cuotasPendientes> = {};
  for (const m of cuotasIncluidas) {
    const anio = m.periodo.split("-")[0];
    porAnio[anio] = [...(porAnio[anio] ?? []), m];
  }

  if (exitoPago) {
    return (
      <div className="bg-status-aprobado-bg border border-status-aprobado-text/20 rounded-xl p-lg flex items-center gap-md">
        <span className="material-symbols-outlined text-status-aprobado-text text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
        <div>
          <h3 className="text-[15px] font-semibold text-status-aprobado-text">¡Pago registrado!</h3>
          <p className="text-[15px] text-on-surface-variant mt-xs">
            Tu pago fue procesado correctamente. Tu carnet se actualizará en breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg w-full">
      {mostrarSimulador && datosPago && (
        <SimuladorPago
          datos={datosPago}
          onExito={() => { setMostrarSimulador(false); setExitoPago(true); onPagoExito(); }}
          onCancelar={() => setMostrarSimulador(false)}
        />
      )}

      {/* Banner de estado */}
      <div className={`rounded-xl p-md border ${
        inhabilitado
          ? "bg-status-rechazado-bg border-status-rechazado-text/20"
          : "bg-status-aprobado-bg border-status-aprobado-text/20"
      }`}>
        <div className="flex items-start gap-md mb-md">
          <span className={`material-symbols-outlined mt-xs ${inhabilitado ? "text-status-rechazado-text" : "text-status-aprobado-text"}`}
            style={{ fontVariationSettings: "'FILL' 1" }}>
            {inhabilitado ? "error" : "check_circle"}
          </span>
          <div>
            <h3 className={`text-[15px] font-semibold ${inhabilitado ? "text-status-rechazado-text" : "text-status-aprobado-text"}`}>
              Estado Actual: {inhabilitado ? "Inhabilitado" : "Habilitado"}
            </h3>
            <p className="text-[15px] text-on-surface-variant mt-xs">
              {inhabilitado
                ? "El colegiado se encuentra inhabilitado para el ejercicio profesional debido a deudas en sus cuotas institucionales."
                : "El colegiado se encuentra habilitado para el ejercicio profesional."}
            </p>
          </div>
        </div>
        {/* Resumen rápido de deuda y vencimiento */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm mt-xs">
          <div className={`rounded-lg px-md py-sm ${inhabilitado ? "bg-white/50" : "bg-white/60"}`}>
            <p className="text-[12px] text-on-surface-variant">Deuda vencida</p>
            <p className={`text-[17px] font-bold ${inhabilitado ? "text-status-rechazado-text" : "text-status-aprobado-text"}`}>
              S/ {(desglose?.totalSoloVencida ?? 0).toFixed(2)}
            </p>
          </div>
          <div className={`rounded-lg px-md py-sm ${inhabilitado ? "bg-white/50" : "bg-white/60"}`}>
            <p className="text-[12px] text-on-surface-variant">Cuotas vencidas</p>
            <p className={`text-[17px] font-bold ${inhabilitado ? "text-status-rechazado-text" : "text-status-aprobado-text"}`}>
              {desglose?.vencidas.length ?? 0} {(desglose?.vencidas.length ?? 0) === 1 ? "mes" : "meses"}
            </p>
          </div>
          <div className={`rounded-lg px-md py-sm col-span-2 sm:col-span-1 ${inhabilitado ? "bg-white/50" : "bg-white/60"}`}>
            <p className="text-[12px] text-on-surface-variant">Carné</p>
            <p className={`text-[15px] font-semibold ${inhabilitado ? "text-status-rechazado-text" : "text-status-aprobado-text"}`}>
              {inhabilitado
                ? `Vencido desde ${desglose && desglose.vencidas.length > 0 ? formatPeriodo(desglose.vencidas[0].periodo) : "—"}`
                : "Vigente y válido"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de deuda */}
      {inhabilitado && cuotasPendientes.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="bg-surface border-b border-outline-variant px-lg py-md flex justify-between items-center">
            <h3 className="text-[20px] font-semibold text-on-surface">Detalle de Deuda</h3>
            <span className="text-[13px] text-on-surface-variant bg-surface-container px-sm py-xs rounded border border-outline-variant">
              Cuota Mensual: S/ 1.00
            </span>
          </div>

          {/* Alcance del pago */}
          {mostrarAlcance && (
            <div className="px-lg pt-md pb-sm border-b border-outline-variant">
              <p className="text-[13px] font-semibold text-on-surface-variant mb-sm uppercase tracking-wide">
                ¿Qué deseas pagar?
              </p>
              <div className="flex bg-surface-container-low p-1 rounded-lg">
                {([
                  { key: "vencidas" as const, label: "Solo deuda vencida" },
                  { key: "todas" as const, label: "Incluir mes actual" },
                ]).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAlcancePago(key)}
                    className={`flex-1 py-sm rounded-md text-[13px] font-medium transition-all ${
                      alcancePago === key
                        ? "bg-surface-container-lowest text-primary font-semibold shadow-sm"
                        : "text-on-surface-variant hover:bg-surface-container-lowest"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {soloVencidas && desglose!.actual.length > 0 && (
                <p className="text-[12px] text-on-surface-variant mt-sm flex items-center gap-xs">
                  <span className="material-symbols-outlined text-base">info</span>
                  El mes actual ({formatPeriodo(desglose!.actual[0].periodo)}) no está incluido; puedes agregarlo arriba.
                </p>
              )}
            </div>
          )}

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="text-[13px] text-on-surface-variant px-lg py-sm font-medium">Concepto</th>
                <th className="text-[13px] text-on-surface-variant px-lg py-sm font-medium text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="text-[15px] text-on-surface">
              {Object.entries(porAnio).map(([anio, cuotas]) => (
                <tr key={anio} className="border-b border-outline-variant/50 hover:bg-surface-bright transition-colors">
                  <td className="px-lg py-md">
                    <div className="font-medium">Cuotas Atrasadas Año {anio}</div>
                    <div className="text-[13px] text-on-surface-variant">
                      {cuotas.map((m) => formatPeriodo(m.periodo).split(" ")[0]).join(", ")} ({cuotas.length} {cuotas.length === 1 ? "mes" : "meses"})
                    </div>
                  </td>
                  <td className="px-lg py-md text-right tabular-nums">
                    S/ {cuotas.reduce((s, m) => s + m.monto, 0).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="border-b border-outline-variant/50">
                <td className="px-lg py-sm text-right text-on-surface-variant">Subtotal cuotas</td>
                <td className="px-lg py-sm text-right tabular-nums text-on-surface-variant">
                  S/ {(totalAPagar - (cuenta!.totalMora ?? 0)).toFixed(2)}
                </td>
              </tr>
              <tr className="border-b border-outline-variant/50">
                <td className="px-lg py-sm text-right text-on-surface-variant">
                  Mora ({cuenta!.moraPorcentaje ?? 0}% · 1% por mes vencido)
                </td>
                <td className="px-lg py-sm text-right tabular-nums text-status-observado-text">
                  S/ {(cuenta!.totalMora ?? 0).toFixed(2)}
                </td>
              </tr>
              <tr className="bg-surface-dim">
                <td className="px-lg py-md text-[20px] font-semibold text-right">Total a Pagar</td>
                <td className="px-lg py-md text-[20px] font-semibold text-right text-primary tabular-nums">
                  S/ {totalAPagar.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Acciones de pago */}
          <div className="p-lg bg-surface border-t border-outline-variant flex flex-col gap-md">
            <h4 className="text-[15px] font-semibold text-on-surface">Registrar Pago</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="pay_method"
                  value="online"
                  checked={metodoPago === "online"}
                  onChange={() => setMetodoPago("online")}
                  className="peer sr-only"
                />
                <div className={`border-2 rounded-xl p-md flex flex-col items-center text-center transition-all ${metodoPago === "online" ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary/50"}`}>
                  <span className="material-symbols-outlined text-primary text-[28px] mb-xs">credit_card</span>
                  <div className="text-[15px] font-semibold text-on-surface">Pagar en Línea</div>
                  <div className="text-[13px] text-on-surface-variant mt-xs">Pasarela integrada (tarjeta)</div>
                </div>
              </label>
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="pay_method"
                  value="voucher"
                  checked={metodoPago === "voucher"}
                  onChange={() => setMetodoPago("voucher")}
                  className="peer sr-only"
                />
                <div className={`border-2 rounded-xl p-md flex flex-col items-center text-center transition-all ${metodoPago === "voucher" ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary/50"}`}>
                  <span className="material-symbols-outlined text-secondary text-[28px] mb-xs">upload_file</span>
                  <div className="text-[15px] font-semibold text-on-surface">Subir Voucher</div>
                  <div className="text-[13px] text-on-surface-variant mt-xs">Transferencia o depósito bancario</div>
                </div>
              </label>
            </div>

            {/* Zona de voucher */}
            {metodoPago === "voucher" && (
              <>
                <input
                  type="file"
                  ref={voucherRef}
                  className="hidden"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) subirVoucher(f); }}
                />
                <button
                  type="button"
                  onClick={() => voucherRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-lg flex flex-col items-center gap-sm transition-colors cursor-pointer ${
                    voucherEstado === "listo" ? "border-status-aprobado-text/40 bg-status-aprobado-bg/20"
                    : voucherEstado === "error" ? "border-error/40 bg-error-container/20"
                    : "border-outline-variant bg-surface-container-lowest hover:bg-surface-bright"
                  }`}
                >
                  {voucherEstado === "subiendo" ? (
                    <><Spinner /><span className="text-[13px] text-on-surface-variant">Subiendo...</span></>
                  ) : voucherEstado === "listo" ? (
                    <><span className="material-symbols-outlined text-status-aprobado-text text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>task</span>
                    <span className="text-[13px] text-status-aprobado-text font-medium">Comprobante cargado</span></>
                  ) : (
                    <><span className="material-symbols-outlined text-[36px] text-on-surface-variant">cloud_upload</span>
                    <p className="text-[15px] font-semibold text-on-background">Subir comprobante de transferencia / depósito</p>
                    <p className="text-[13px] text-on-surface-variant">JPG, PNG o PDF · Máx. 5 MB</p></>
                  )}
                </button>
                {voucherEstado === "error" && (
                  <p className="text-error text-[13px]">Error al subir. Intenta de nuevo.</p>
                )}
              </>
            )}

            {/* Nota efectivo */}
            <div className="flex items-start gap-sm bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant mt-xs">info</span>
              <p className="text-[13px] text-on-surface-variant">
                El pago en efectivo es gestionado directamente por el Revisor Regional desde el módulo{" "}
                <span className="font-semibold text-on-surface">Terminal de Cobro</span>.
              </p>
            </div>

            {errorPago && (
              <div className="bg-error-container border border-error/20 text-error rounded-lg px-md py-sm flex items-center gap-sm text-[13px]">
                <span className="material-symbols-outlined">error</span>
                {errorPago}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-md justify-end">
              <button className="w-full sm:w-auto h-[48px] px-lg rounded flex items-center justify-center gap-sm text-[15px] font-semibold bg-surface-container-lowest text-on-surface hover:bg-surface-dim transition-colors border border-outline-variant">
                <span className="material-symbols-outlined text-xl">download</span>
                Estado de Cuenta
              </button>
              <button
                type="button"
                onClick={() => metodoPago === "online" ? setMostrarSimulador(true) : confirmarVoucher()}
                disabled={procesando || (metodoPago === "voucher" && voucherEstado !== "listo")}
                className="w-full sm:w-auto h-[48px] px-xl rounded flex items-center justify-center gap-sm text-[15px] font-semibold bg-primary text-on-primary hover:brightness-110 transition-all shadow-sm disabled:opacity-60"
              >
                {procesando && <Spinner />}
                <span className="material-symbols-outlined text-xl">credit_card</span>
                Procesar Pago S/ {totalAPagar.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Habilitado: sin deuda */}
      {!inhabilitado && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="p-lg flex items-center gap-md">
            <div className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-on-surface">
                {carnet.nombres} {carnet.apellidoPaterno} {carnet.apellidoMaterno}
              </p>
              <p className="text-[13px] text-on-surface-variant">
                CIP: {carnet.codigo} · Ing. {carnet.carrera.nombre} · {carnet.region.nombre}
              </p>
            </div>
          </div>
          {/* Resumen de estado */}
          <div className="border-t border-outline-variant grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant">
            <div className="px-lg py-md flex flex-col gap-xs">
              <p className="text-[13px] text-on-surface-variant">Estado de cuotas</p>
              <p className="text-[15px] font-semibold text-status-aprobado-text flex items-center gap-xs">
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Sin deudas pendientes
              </p>
            </div>
            <div className="px-lg py-md flex flex-col gap-xs">
              <p className="text-[13px] text-on-surface-variant">Deuda total</p>
              <p className="text-[15px] font-semibold text-on-surface">S/ 0.00</p>
            </div>
            <div className="px-lg py-md flex flex-col gap-xs">
              <p className="text-[13px] text-on-surface-variant">Carné</p>
              <p className="text-[15px] font-semibold text-status-aprobado-text flex items-center gap-xs">
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                Vigente y válido
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ConsultaCarnetPage() {
  const [query, setQuery] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [carnet, setCarnet] = useState<CarnetData | null>(null);
  const [cuenta, setCuenta] = useState<EstadoCuenta | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    const q = query.trim();
    if (!q) return;
    setBuscando(true);
    setError(null);
    setCarnet(null);
    setCuenta(null);
    try {
      const [carnetData, cuentaData] = await Promise.allSettled([
        buscarColegiado(q),
        obtenerEstadoCuenta(q),
      ]);
      if (carnetData.status === "rejected") {
        setError("No se encontró ningún colegiado con el DNI o código CIP ingresado.");
        return;
      }
      setCarnet(carnetData.value);
      if (cuentaData.status === "fulfilled") {
        setCuenta(cuentaData.value);
      }
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
            <h1 className="text-[20px] font-semibold text-on-surface">Consulta de Estado y Deudas</h1>
            <p className="text-[15px] text-on-surface-variant">
              Ingrese su DNI o Código CIP para verificar el estado actual, visualizar su carnet digital y consultar deudas pendientes.
            </p>
            <div className="flex flex-col sm:flex-row gap-sm mt-sm">
              <div className="relative flex-grow">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-secondary-fixed-dim">search</span>
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
          <div className="max-w-container-max-form mx-auto w-full bg-error-container border border-error/20 text-error rounded-xl px-lg py-md flex items-center gap-md text-[15px]">
            <span className="material-symbols-outlined">search_off</span>
            {error}
          </div>
        )}

        {/* Resultados */}
        {carnet && (
          <section className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-xl items-start">
            {/* Columna izquierda: carnet */}
            <div className="flex flex-col gap-sm items-center lg:items-start w-full lg:w-auto">
              <h2 className="text-[15px] font-semibold text-on-surface px-sm">Vista Previa de Carnet</h2>
              <div className="overflow-x-auto max-w-full">
                <TarjetaCarnet datos={carnet} />
              </div>
              {carnet.inhabilitado && (
                <div className="text-[13px] text-on-surface-variant text-center w-full max-w-[480px] mt-xs flex items-center justify-center gap-xs">
                  <span className="material-symbols-outlined text-base text-primary">info</span>
                  El carnet digital no es válido mientras mantenga estado inhabilitado.
                </div>
              )}
            </div>

            {/* Columna derecha: estado y pago */}
            <PanelDeudaYPago
              carnet={carnet}
              cuenta={cuenta}
              onPagoExito={() => buscar()}
            />
          </section>
        )}

        {/* Estado vacío */}
        {!carnet && !error && !buscando && (
          <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
            <span className="material-symbols-outlined text-outline" style={{ fontSize: "48px" }}>badge</span>
            <p className="text-[15px] text-on-surface-variant max-w-xs">
              Ingresa tu DNI o código CIP en el buscador para ver tu carnet y estado de habilidad.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
