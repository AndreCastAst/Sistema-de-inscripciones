"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { registrarSimulacion } from "@/lib/api";

// ─── Datos de bancos y billeteras del Perú ───────────────────────────────────

const BANCOS = [
  { id: "BCP", nombre: "BCP", descripcion: "Banco de Crédito del Perú", color: "#003DA5", cuenta: "193-1234567-0-89", tipo: "banco" },
  { id: "BBVA", nombre: "BBVA", descripcion: "BBVA Perú", color: "#004481", cuenta: "0011-0186-0200045832", tipo: "banco" },
  { id: "INTERBANK", nombre: "Interbank", descripcion: "Interbank", color: "#00A651", cuenta: "200-300001633-6", tipo: "banco" },
  { id: "SCOTIABANK", nombre: "Scotiabank", descripcion: "Scotiabank Perú", color: "#EC111A", cuenta: "000-7028024-1", tipo: "banco" },
  { id: "BANBIF", nombre: "BanBif", descripcion: "BanBif", color: "#6A2D8F", cuenta: "010200011234567", tipo: "banco" },
  { id: "NACION", nombre: "Bco. Nación", descripcion: "Banco de la Nación", color: "#1D3C89", cuenta: "000-123456", tipo: "banco" },
  { id: "MIBANCO", nombre: "Mibanco", descripcion: "Mibanco", color: "#F7941E", cuenta: "119-01-00-123456", tipo: "banco" },
  { id: "PICHINCHA", nombre: "Pichincha", descripcion: "Banco Pichincha", color: "#00843D", cuenta: "2100-0123456-78", tipo: "banco" },
  { id: "GNB", nombre: "GNB Banco", descripcion: "GNB Banco", color: "#005BAA", cuenta: "100-01-1234567", tipo: "banco" },
  { id: "ALFIN", nombre: "Alfin", descripcion: "Alfin Banco", color: "#00A88F", cuenta: "360100012345", tipo: "banco" },
];

const BILLETERAS = [
  { id: "YAPE", nombre: "Yape", descripcion: "Billetera BCP", color: "#6A1B9A", cuenta: "N/A", tipo: "digital" },
  { id: "PLIN", nombre: "Plin", descripcion: "BBVA / Interbank / Scotia", color: "#0071BC", cuenta: "N/A", tipo: "digital" },
  { id: "LUKITA", nombre: "Lukita", descripcion: "BanBif", color: "#E5007D", cuenta: "N/A", tipo: "digital" },
  { id: "TUNKI", nombre: "Tunki", descripcion: "Interbank", color: "#FF6B00", cuenta: "N/A", tipo: "digital" },
];

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Paso = "seleccion" | "formulario" | "procesando" | "comprobante";

export interface DatosPago {
  tipo: "inscripcion" | "mensualidades";
  monto: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  codigoCIP?: string;
  carrera?: string;
  periodos?: string[];
  codigo?: string;
}

interface Props {
  datos: DatosPago;
  onExito: (info: { banco: string; numOp: string; codigoVoucher: string }) => void;
  onCancelar: () => void;
}

// ─── Helper: número a letras (español) ───────────────────────────────────────

function cantidadEnLetras(monto: number): string {
  const unidades = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
    "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const decenas = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
    "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

  function convertir(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "CIEN";
    if (n < 20) return unidades[n];
    if (n < 100) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      return u === 0 ? decenas[d] : `${decenas[d]} Y ${unidades[u]}`;
    }
    if (n < 1000) {
      const c = Math.floor(n / 100);
      const resto = n % 100;
      return resto === 0 ? centenas[c] : `${centenas[c]} ${convertir(resto)}`;
    }
    if (n < 2000) return `MIL${n % 1000 === 0 ? "" : " " + convertir(n % 1000)}`;
    const miles = Math.floor(n / 1000);
    const resto = n % 1000;
    return resto === 0 ? `${convertir(miles)} MIL` : `${convertir(miles)} MIL ${convertir(resto)}`;
  }

  const entero = Math.floor(monto);
  const cents = Math.round((monto - entero) * 100);
  return `${convertir(entero)} Y ${cents.toString().padStart(2, "0")}/100 SOLES`;
}

function formatFecha(date: Date): string {
  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatHora(date: Date): string {
  return date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatPeriodo(periodo: string): string {
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const [anio, mes] = periodo.split("-");
  return `${meses[parseInt(mes) - 1]} ${anio}`;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function SimuladorPago({ datos, onExito, onCancelar }: Props) {
  const [paso, setPaso] = useState<Paso>("seleccion");
  const [entidadSeleccionada, setEntidadSeleccionada] = useState<typeof BANCOS[0] | null>(null);
  const [codigoVoucher, setCodigoVoucher] = useState("");
  const [errorCodigoVoucher, setErrorCodigoVoucher] = useState<string | null>(null);
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [fechaPago] = useState(new Date());
  const [numeroBoleta] = useState(() =>
    String(Math.floor(1000000 + Math.random() * 9000000)).padStart(8, "0")
  );
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);

  const todasEntidades = [...BANCOS, ...BILLETERAS];

  // ── IGV ────────────────────────────────────────────────────────────────────
  const valorVenta = Math.round((datos.monto / 1.18) * 100) / 100;
  const igv = Math.round((datos.monto - valorVenta) * 100) / 100;

  // ── Concepto ───────────────────────────────────────────────────────────────
  const conceptoDetalle = datos.tipo === "inscripcion"
    ? "Derecho de Inscripción – Colegiatura"
    : datos.periodos?.map(formatPeriodo).join(", ") ?? "";

  // ── Número de operación ────────────────────────────────────────────────────
  function generarNumOp(entidad: typeof BANCOS[0]): string {
    return `${entidad.id}-${Date.now().toString().slice(-8)}`;
  }

  async function confirmarPago() {
    if (!entidadSeleccionada) return;
    if (!/^\d{8}$/.test(codigoVoucher)) {
      setErrorCodigoVoucher("Ingresa un código de voucher válido de 8 dígitos.");
      return;
    }
    setErrorCodigoVoucher(null);
    const numOp = generarNumOp(entidadSeleccionada);
    setNumeroOperacion(numOp);
    setPaso("procesando");

    await new Promise((r) => setTimeout(r, 2500));

    try {
      await registrarSimulacion({
        banco: entidadSeleccionada.nombre,
        numeroOperacion: numOp,
        tipo: datos.tipo,
        codigo: datos.codigo,
        periodos: datos.periodos,
      });
    } catch {
      setErrorRegistro("El pago fue simulado correctamente pero no se pudo registrar en el sistema.");
    }

    setPaso("comprobante");
  }

  // ── Imprimir boleta ────────────────────────────────────────────────────────
  function imprimir() {
    const nombreCompleto = `${datos.apellidoPaterno} ${datos.apellidoMaterno}, ${datos.nombres}`;
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Boleta de Venta B001-${numeroBoleta}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; padding: 20px; max-width: 600px; margin: auto; }
    .titulo { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 2px; }
    .subtitulo { text-align: center; font-size: 11px; margin-bottom: 2px; }
    .linea { border-top: 1px dashed #000; margin: 8px 0; }
    .linea-doble { border-top: 2px solid #000; margin: 8px 0; }
    .tipo-doc { text-align: center; font-weight: bold; font-size: 13px; margin: 6px 0 2px; }
    .serie { text-align: center; font-size: 12px; margin-bottom: 6px; }
    .fila { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .fila-titulo { font-weight: bold; margin-top: 6px; margin-bottom: 3px; }
    .fila-item { display: flex; justify-content: space-between; padding: 2px 0; }
    .monto { text-align: right; min-width: 80px; }
    .total { font-weight: bold; font-size: 13px; }
    .estado { text-align: center; font-weight: bold; font-size: 14px; margin: 8px 0; color: #000; border: 2px solid #000; padding: 4px; }
    .pie { text-align: center; font-size: 10px; margin-top: 8px; color: #444; }
    .simulacion { text-align: center; font-size: 10px; margin-top: 6px; font-style: italic; border: 1px dashed #999; padding: 4px; color: #666; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="titulo">COLEGIO DE INGENIEROS DEL PERÚ</div>
  <div class="subtitulo">RUC: 20100149286</div>
  <div class="subtitulo">Av. Arequipa 4947, Miraflores, Lima 15074</div>
  <div class="subtitulo">Tel: (01) 445-9800</div>
  <div class="linea"></div>
  <div class="tipo-doc">BOLETA DE VENTA ELECTRÓNICA</div>
  <div class="serie">Serie: B001 &nbsp;&nbsp;&nbsp; Número: ${numeroBoleta}</div>
  <div class="fila"><span>Fecha:</span><span>${formatFecha(fechaPago)}</span></div>
  <div class="fila"><span>Hora:</span><span>${formatHora(fechaPago)}</span></div>
  <div class="linea"></div>
  <div class="fila-titulo">DATOS DEL CLIENTE</div>
  <div class="fila"><span>Apellidos y Nombres:</span><span>${nombreCompleto}</span></div>
  ${datos.codigoCIP ? `<div class="fila"><span>Código CIP:</span><span>${datos.codigoCIP}</span></div>` : ""}
  ${datos.carrera ? `<div class="fila"><span>Especialidad:</span><span>Ing. ${datos.carrera}</span></div>` : ""}
  <div class="linea"></div>
  <div class="fila-titulo">DETALLE</div>
  ${datos.tipo === "inscripcion"
    ? `<div class="fila-item"><span>Inscripción – Colegiatura CIP</span><span class="monto">S/ ${valorVenta.toFixed(2)}</span></div>`
    : datos.periodos?.map(p => `<div class="fila-item"><span>Cuota Ordinaria – ${formatPeriodo(p)}</span><span class="monto">S/ ${(20 / 1.18).toFixed(2)}</span></div>`).join("") ?? ""
  }
  <div class="linea"></div>
  <div class="fila"><span>OP. GRAVADA:</span><span class="monto">S/ ${valorVenta.toFixed(2)}</span></div>
  <div class="fila"><span>IGV (18%):</span><span class="monto">S/ ${igv.toFixed(2)}</span></div>
  <div class="linea-doble"></div>
  <div class="fila total"><span>IMPORTE TOTAL:</span><span class="monto">S/ ${datos.monto.toFixed(2)}</span></div>
  <div class="linea"></div>
  <div><strong>Son:</strong> ${cantidadEnLetras(datos.monto)}</div>
  <div class="linea"></div>
  <div class="fila-titulo">DATOS DEL PAGO</div>
  <div class="fila"><span>Entidad:</span><span>${entidadSeleccionada?.nombre} – ${entidadSeleccionada?.descripcion}</span></div>
  <div class="fila"><span>Tipo:</span><span>${entidadSeleccionada?.tipo === "digital" ? "Billetera digital" : "Transferencia bancaria"}</span></div>
  <div class="fila"><span>N° Operación:</span><span>${numeroOperacion}</span></div>
  <div class="fila"><span>Cód. Voucher Digital:</span><span>${codigoVoucher}</span></div>
  <div class="linea"></div>
  <div class="estado">✓ PAGADO</div>
  <div class="pie">Representación impresa de Boleta de Venta Electrónica</div>
  <div class="simulacion">⚠ COMPROBANTE DE SIMULACIÓN – Sistema de Inscripciones CIP – Curso Agile Development</div>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

    const ventana = window.open("", "_blank", "width=640,height=800");
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — overlay sobre la página
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-md">
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Encabezado ────────────────────────────────────────────────── */}
        <div className="bg-primary px-lg py-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-sm text-on-primary">
            <span className="material-symbols-outlined text-2xl">account_balance</span>
            <div>
              <p className="text-[16px] font-semibold">Pasarela de Pagos – Simulación</p>
              <p className="text-[12px] opacity-80">Colegio de Ingenieros del Perú</p>
            </div>
          </div>
          <div className="text-right text-on-primary">
            <p className="text-[12px] opacity-80">{datos.tipo === "inscripcion" ? "Inscripción" : "Cuota(s) ordinaria(s)"}</p>
            <p className="text-[22px] font-bold">S/ {datos.monto.toFixed(2)}</p>
          </div>
        </div>

        {/* ── Contenido por paso ────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-lg">

          {/* ── PASO 1: Selección de banco ─────────────────────────────── */}
          {paso === "seleccion" && (
            <div className="space-y-lg">
              <p className="text-[15px] text-on-surface font-semibold">Selecciona tu banco o billetera:</p>

              <div>
                <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-sm">
                  Banca en línea
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-sm">
                  {BANCOS.map((banco) => (
                    <button
                      key={banco.id}
                      onClick={() => setEntidadSeleccionada(banco)}
                      className={`rounded-xl border-2 p-sm flex flex-col items-center gap-xs text-center transition-all hover:shadow-md ${
                        entidadSeleccionada?.id === banco.id
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-outline-variant bg-surface-bright hover:border-primary/50"
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-[10px] font-bold leading-tight text-center"
                        style={{ backgroundColor: banco.color }}
                      >
                        {banco.nombre}
                      </div>
                      <span className="text-[11px] text-on-surface font-medium">{banco.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-sm">
                  Billeteras digitales
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm">
                  {BILLETERAS.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setEntidadSeleccionada(b)}
                      className={`rounded-xl border-2 p-sm flex flex-col items-center gap-xs text-center transition-all hover:shadow-md ${
                        entidadSeleccionada?.id === b.id
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-outline-variant bg-surface-bright hover:border-primary/50"
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: b.color }}
                      >
                        {b.nombre.slice(0, 2)}
                      </div>
                      <span className="text-[11px] text-on-surface font-medium">{b.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-sm bg-primary/5 border border-primary/20 rounded-lg p-md text-[12px] text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-base shrink-0">info</span>
                Esta es una simulación de pago. No se realizará ningún cargo real.
              </div>
            </div>
          )}

          {/* ── PASO 2: Formulario de pago simulado ───────────────────── */}
          {paso === "formulario" && entidadSeleccionada && (
            <div className="space-y-lg">
              <div className="flex items-center gap-md">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-[11px] font-bold text-center"
                  style={{ backgroundColor: entidadSeleccionada.color }}
                >
                  {entidadSeleccionada.nombre}
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-on-surface">{entidadSeleccionada.descripcion}</p>
                  <p className="text-[13px] text-on-surface-variant">Banca en línea – simulación</p>
                </div>
              </div>

              <div className="bg-surface-container-low rounded-xl border border-outline-variant divide-y divide-outline-variant">
                {entidadSeleccionada.tipo === "banco" && (
                  <div className="flex justify-between items-center px-md py-sm">
                    <span className="text-[13px] text-on-surface-variant">Cuenta bancaria:</span>
                    <span className="text-[13px] font-mono font-semibold text-on-surface">{entidadSeleccionada.cuenta}</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-md py-sm">
                  <span className="text-[13px] text-on-surface-variant">Titular:</span>
                  <span className="text-[13px] font-semibold text-on-surface">Colegio de Ingenieros del Perú</span>
                </div>
                <div className="flex justify-between items-center px-md py-sm">
                  <span className="text-[13px] text-on-surface-variant">Concepto:</span>
                  <span className="text-[13px] text-on-surface text-right max-w-[200px]">
                    {datos.tipo === "inscripcion" ? "Inscripción – Colegiatura CIP" : `Cuota(s): ${conceptoDetalle}`}
                  </span>
                </div>
                <div className="flex justify-between items-center px-md py-sm bg-primary/5">
                  <span className="text-[15px] font-semibold text-on-surface">Monto a pagar:</span>
                  <span className="text-[20px] font-bold text-primary">S/ {datos.monto.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-xs">
                <label className="text-[13px] font-medium text-on-surface-variant">
                  Código de voucher digital:
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={codigoVoucher}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                    setCodigoVoucher(val);
                    if (errorCodigoVoucher) setErrorCodigoVoucher(null);
                  }}
                  placeholder="Ingresa el código de 8 dígitos"
                  className="w-full text-[15px] font-mono border border-outline-variant rounded-lg px-md py-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
                {errorCodigoVoucher && (
                  <p className="text-[12px] text-error">{errorCodigoVoucher}</p>
                )}
                <p className="text-[12px] text-on-surface-variant">Ingresa el código de 8 dígitos que aparece en tu operación bancaria.</p>
              </div>

              <div className="flex items-start gap-sm bg-yellow-50 border border-yellow-200 rounded-lg p-sm text-[12px] text-yellow-800">
                <span className="material-symbols-outlined text-base shrink-0">warning</span>
                Simulación de pago – Ningún cargo real será realizado.
              </div>
            </div>
          )}

          {/* ── PASO 3: Procesando ─────────────────────────────────────── */}
          {paso === "procesando" && (
            <div className="flex flex-col items-center justify-center py-xl gap-lg">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-outline-variant rounded-full"></div>
                <div className="w-20 h-20 border-4 border-t-primary rounded-full animate-spin absolute inset-0"></div>
              </div>
              <div className="text-center">
                <p className="text-[17px] font-semibold text-on-surface">Procesando tu pago...</p>
                <p className="text-[14px] text-on-surface-variant mt-xs">
                  Conectando con {entidadSeleccionada?.descripcion}
                </p>
              </div>
              <div className="flex flex-col gap-xs w-full max-w-xs">
                {["Verificando cuenta...", "Autorizando transacción...", "Confirmando pago..."].map((msg, i) => (
                  <div key={i} className="flex items-center gap-sm text-[13px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PASO 4: Comprobante ────────────────────────────────────── */}
          {paso === "comprobante" && (
            <div className="space-y-md">
              {/* Header éxito */}
              <div className="flex items-center gap-md p-md bg-status-aprobado-bg rounded-xl border border-status-aprobado-text/20">
                <span
                  className="material-symbols-outlined text-status-aprobado-text"
                  style={{ fontSize: "40px", fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <div>
                  <p className="text-[16px] font-semibold text-on-surface">¡Pago realizado con éxito!</p>
                  <p className="text-[13px] text-on-surface-variant">Tu comprobante ha sido generado.</p>
                </div>
              </div>

              {errorRegistro && (
                <div className="flex items-start gap-sm bg-yellow-50 border border-yellow-200 rounded-lg p-sm text-[13px] text-yellow-800">
                  <span className="material-symbols-outlined text-base shrink-0">warning</span>
                  {errorRegistro}
                </div>
              )}

              {/* Comprobante visual */}
              <div className="border-2 border-outline-variant rounded-xl overflow-hidden font-mono text-[13px]">
                {/* Header comprobante */}
                <div className="bg-surface-container-low px-lg py-md text-center border-b border-outline-variant">
                  <p className="font-bold text-[14px] text-on-surface">COLEGIO DE INGENIEROS DEL PERÚ</p>
                  <p className="text-[12px] text-on-surface-variant">RUC: 20100149286</p>
                  <p className="text-[12px] text-on-surface-variant">Av. Arequipa 4947, Miraflores, Lima 15074</p>
                  <p className="text-[12px] text-on-surface-variant">Tel: (01) 445-9800</p>
                </div>

                {/* Tipo de documento */}
                <div className="text-center py-sm border-b border-outline-variant bg-primary/5">
                  <p className="font-bold text-[13px] text-on-surface">BOLETA DE VENTA ELECTRÓNICA</p>
                  <p className="text-[12px] text-on-surface-variant">Serie: B001 &nbsp;|&nbsp; N°: {numeroBoleta}</p>
                  <p className="text-[12px] text-on-surface-variant">
                    {formatFecha(fechaPago)} &nbsp;&nbsp; {formatHora(fechaPago)}
                  </p>
                </div>

                <div className="px-lg py-md space-y-sm">
                  {/* Datos cliente */}
                  <div className="border-b border-outline-variant pb-sm">
                    <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-xs">Datos del Cliente</p>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Apellidos y Nombres:</span>
                      <span className="font-semibold text-on-surface text-right">
                        {datos.apellidoPaterno} {datos.apellidoMaterno}, {datos.nombres}
                      </span>
                    </div>
                    {datos.codigoCIP && (
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Código CIP:</span>
                        <span className="font-semibold text-on-surface">{datos.codigoCIP}</span>
                      </div>
                    )}
                    {datos.carrera && (
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Especialidad:</span>
                        <span className="font-semibold text-on-surface">Ing. {datos.carrera}</span>
                      </div>
                    )}
                  </div>

                  {/* Detalle */}
                  <div className="border-b border-outline-variant pb-sm">
                    <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-xs">Detalle</p>
                    {datos.tipo === "inscripcion" ? (
                      <div className="flex justify-between">
                        <span className="text-on-surface">Inscripción – Colegiatura CIP</span>
                        <span className="text-on-surface font-semibold">S/ {valorVenta.toFixed(2)}</span>
                      </div>
                    ) : (
                      datos.periodos?.map((p) => (
                        <div key={p} className="flex justify-between">
                          <span className="text-on-surface">Cuota Ordinaria – {formatPeriodo(p)}</span>
                          <span className="text-on-surface font-semibold">S/ {(20 / 1.18).toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Totales */}
                  <div className="border-b border-outline-variant pb-sm space-y-xs">
                    <div className="flex justify-between text-on-surface-variant">
                      <span>OP. GRAVADA:</span><span>S/ {valorVenta.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-on-surface-variant">
                      <span>IGV (18%):</span><span>S/ {igv.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[15px] text-on-surface pt-xs border-t border-outline-variant">
                      <span>IMPORTE TOTAL:</span><span className="text-primary">S/ {datos.monto.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Son */}
                  <p className="text-[12px] text-on-surface-variant italic">
                    Son: {cantidadEnLetras(datos.monto)}
                  </p>

                  {/* Datos del pago */}
                  <div className="border-t border-outline-variant pt-sm space-y-xs">
                    <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Datos del Pago</p>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Entidad:</span>
                      <span className="font-semibold text-on-surface">{entidadSeleccionada?.descripcion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Tipo:</span>
                      <span className="text-on-surface">
                        {entidadSeleccionada?.tipo === "digital" ? "Billetera digital" : "Transferencia bancaria"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">N° Operación:</span>
                      <span className="font-mono font-semibold text-on-surface">{numeroOperacion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Cód. Voucher Digital:</span>
                      <span className="font-mono font-semibold text-on-surface">{codigoVoucher}</span>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="flex items-center justify-center gap-sm py-sm border-2 border-status-aprobado-text/40 bg-status-aprobado-bg rounded-lg">
                    <span className="material-symbols-outlined text-status-aprobado-text" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    <span className="font-bold text-[14px] text-status-aprobado-text">PAGADO</span>
                  </div>

                  <p className="text-[10px] text-on-surface-variant text-center">
                    Representación impresa de Boleta de Venta Electrónica · Simulación – Sistema CIP
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Pie con botones ───────────────────────────────────────────── */}
        {paso !== "procesando" && (
          <div className="border-t border-outline-variant px-lg py-md flex justify-between items-center shrink-0 bg-surface-container-lowest">
            {paso === "seleccion" && (
              <>
                <button
                  onClick={onCancelar}
                  className="text-[14px] text-on-surface-variant hover:text-on-surface px-md py-sm rounded-lg hover:bg-surface-container transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => entidadSeleccionada && setPaso("formulario")}
                  disabled={!entidadSeleccionada}
                  className="bg-primary text-on-primary text-[15px] font-semibold px-xl py-sm rounded-lg hover:brightness-110 transition-all disabled:opacity-40 flex items-center gap-sm"
                >
                  Continuar
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </button>
              </>
            )}

            {paso === "formulario" && (
              <>
                <button
                  onClick={() => { setEntidadSeleccionada(null); setPaso("seleccion"); }}
                  className="text-[14px] text-on-surface-variant hover:text-on-surface px-md py-sm rounded-lg hover:bg-surface-container transition-colors flex items-center gap-xs"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Volver
                </button>
                <button
                  onClick={confirmarPago}
                  className="bg-primary text-on-primary text-[15px] font-semibold px-xl py-sm rounded-lg hover:brightness-110 transition-all flex items-center gap-sm"
                >
                  <span className="material-symbols-outlined text-xl">lock</span>
                  Confirmar Pago
                </button>
              </>
            )}

            {paso === "comprobante" && (
              <>
                <button
                  onClick={imprimir}
                  className="flex items-center gap-sm border border-outline-variant text-on-surface text-[14px] font-semibold px-lg py-sm rounded-lg hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">print</span>
                  Imprimir boleta
                </button>
                <button
                  onClick={() => onExito({ banco: entidadSeleccionada!.id, numOp: numeroOperacion, codigoVoucher })}
                  className="bg-primary text-on-primary text-[15px] font-semibold px-xl py-sm rounded-lg hover:brightness-110 transition-all flex items-center gap-sm"
                >
                  <span className="material-symbols-outlined text-xl">check</span>
                  Finalizar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
