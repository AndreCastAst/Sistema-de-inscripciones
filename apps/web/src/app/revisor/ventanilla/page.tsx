"use client";

import { useState, useRef, useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { consultarDNI, crearPostulacion, getRegiones, getCarreras, obtenerEstadoCuenta, registrarSimulacion, type EstadoCuenta } from "@/lib/api";
import { subirImagen, subirPDF } from "@/lib/cloudinary";
import { SimuladorPago, type DatosPago } from "@/components/pagos/SimuladorPago";
import type { Carrera } from "@/types";

type TabActiva = "nuevo" | "cobro";
type MetodoCobro = "efectivo" | "digital" | "voucher";
type MetodoPagoNuevo = "efectivo" | "digital" | "voucher";

// ── Tab: Nuevo Expediente Físico ──────────────────────────────────────────────

function TabNuevoExpediente() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [regionId, setRegionId] = useState<number | null>(null);

  const [dni, setDni] = useState("");
  const [buscandoDNI, setBuscandoDNI] = useState(false);
  const [dniVerificado, setDniVerificado] = useState(false);
  const [nombres, setNombres] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [gmail, setGmail] = useState("");
  const [carreraId, setCarreraId] = useState("");
  const [errorDNI, setErrorDNI] = useState<string | null>(null);

  const fotoRef = useRef<HTMLInputElement>(null);
  const tituloRef = useRef<HTMLInputElement>(null);
  const voucherRef = useRef<HTMLInputElement>(null);

  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoEstado, setFotoEstado] = useState<"idle" | "subiendo" | "listo" | "error">("idle");
  const [tituloUrl, setTituloUrl] = useState<string | null>(null);
  const [tituloEstado, setTituloEstado] = useState<"idle" | "subiendo" | "listo" | "error">("idle");
  const [voucherUrl, setVoucherUrl] = useState<string | null>(null);
  const [voucherEstado, setVoucherEstado] = useState<"idle" | "subiendo" | "listo" | "error">("idle");

  const [metodoPago, setMetodoPago] = useState<MetodoPagoNuevo>("efectivo");
  const [mostrarSimulador, setMostrarSimulador] = useState(false);
  const [pagoRef, setPagoRef] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getRegiones(), getCarreras()])
      .then(([regiones, carreras]) => {
        setCarreras(carreras);
        const laLibertad = regiones.find((r) => r.nombre === "La Libertad");
        if (laLibertad) setRegionId(laLibertad.id);
      })
      .catch(() => {
        setRegionId(5); // fallback — La Libertad es la 5ª región en el seed
        setCarreras([
          { id: 1, nombre: "Civil" }, { id: 2, nombre: "Sistemas e Informática" },
          { id: 3, nombre: "Industrial" }, { id: 4, nombre: "Mecánica" },
        ]);
      });
  }, []);

  async function validarDNI() {
    if (!/^\d{8}$/.test(dni)) { setErrorDNI("Ingresa 8 dígitos numéricos"); return; }
    setBuscandoDNI(true);
    setErrorDNI(null);
    try {
      const datos = await consultarDNI(dni);
      setNombres(datos.nombres);
      setApellidoPaterno(datos.apellidoPaterno);
      setApellidoMaterno(datos.apellidoMaterno);
      setDniVerificado(true);
    } catch {
      setErrorDNI("DNI no encontrado en RENIEC");
    } finally {
      setBuscandoDNI(false);
    }
  }

  async function subirArchivo(file: File, tipo: "foto" | "titulo" | "voucher") {
    const setEstado = tipo === "foto" ? setFotoEstado : tipo === "titulo" ? setTituloEstado : setVoucherEstado;
    const setUrl = tipo === "foto" ? setFotoUrl : tipo === "titulo" ? setTituloUrl : setVoucherUrl;
    setEstado("subiendo");
    try {
      const url = file.type === "application/pdf" ? await subirPDF(file) : await subirImagen(file);
      setUrl(url); setEstado("listo");
    } catch {
      setEstado("error");
    }
  }

  const pagoCompleto =
    (metodoPago === "efectivo") ||
    (metodoPago === "digital" && pagoRef !== null) ||
    (metodoPago === "voucher" && voucherEstado === "listo");

  async function registrar() {
    if (!dniVerificado || !fotoUrl || !tituloUrl || !gmail || !carreraId || !regionId || !pagoCompleto) {
      setError("Complete todos los campos, suba los documentos y registre el pago.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      let voucherFinal: string | undefined;
      if (metodoPago === "efectivo") {
        voucherFinal = `SIM-EFECTIVO-VNT-${Date.now()}`;
      } else if (metodoPago === "digital") {
        voucherFinal = pagoRef ?? undefined;
      } else {
        voucherFinal = voucherUrl ?? undefined;
      }
      const result = await crearPostulacion({
        dni, nombres, apellidoPaterno, apellidoMaterno, gmail,
        regionId,
        carreraId: Number(carreraId),
        fotoUrl, tituloUrl,
        voucherUrl: voucherFinal,
        esFisico: true,
      });
      setExito(result.id);
    } catch {
      setError("Error al registrar el expediente. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function resetForm() {
    setDni(""); setDniVerificado(false); setNombres(""); setApellidoPaterno(""); setApellidoMaterno("");
    setGmail(""); setCarreraId("");
    setFotoUrl(null); setFotoEstado("idle"); setTituloUrl(null); setTituloEstado("idle");
    setVoucherUrl(null); setVoucherEstado("idle"); setMetodoPago("efectivo"); setPagoRef(null);
    setError(null); setExito(null);
  }

  const datosPago: DatosPago = {
    tipo: "inscripcion", monto: 1500,
    nombres: nombres || "Postulante",
    apellidoPaterno, apellidoMaterno,
  };

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
        <span className="material-symbols-outlined text-status-aprobado-text" style={{ fontSize: "56px", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        <h3 className="text-[20px] font-semibold text-on-surface">Expediente registrado</h3>
        <p className="text-[15px] text-on-surface-variant">Expediente N° <strong>{exito}</strong> creado exitosamente.</p>
        <button onClick={resetForm} className="bg-primary text-on-primary px-lg py-2.5 rounded-lg text-[15px] font-semibold hover:brightness-110 transition-all">
          Nuevo expediente
        </button>
      </div>
    );
  }

  return (
    <>
      {mostrarSimulador && (
        <SimuladorPago
          datos={datosPago}
          onExito={(info) => {
            const digits = info.numOp.split("-")[1] ?? Date.now().toString().slice(-8);
            setPagoRef(`SIM-${info.banco}-${digits}-${info.codigoVoucher}`);
            setMostrarSimulador(false);
          }}
          onCancelar={() => setMostrarSimulador(false)}
        />
      )}

    <div className="space-y-lg">
      {/* DNI */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant p-md">
        <h3 className="text-[15px] font-semibold text-on-surface mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
          Validación RENIEC
        </h3>
        <div className="flex gap-sm mb-sm">
          <input
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="DNI de 8 dígitos"
            className="flex-grow text-[15px] border border-outline-variant rounded-lg px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-surface-container-lowest"
          />
          <button
            type="button"
            onClick={validarDNI}
            disabled={buscandoDNI}
            className={`flex items-center gap-xs px-md rounded-lg border text-[15px] font-semibold transition-colors ${
              dniVerificado
                ? "bg-status-aprobado-bg text-status-aprobado-text border-status-aprobado-text/30"
                : "bg-primary text-on-primary border-transparent hover:brightness-110"
            }`}
          >
            {buscandoDNI && <Spinner />}
            {dniVerificado ? "Verificado ✓" : "Validar"}
          </button>
        </div>
        {errorDNI && <p className="text-error text-[13px]">{errorDNI}</p>}
        {dniVerificado && (
          <div className="grid grid-cols-3 gap-sm mt-sm">
            {[
              { label: "Nombres", value: nombres },
              { label: "Apellido Paterno", value: apellidoPaterno },
              { label: "Apellido Materno", value: apellidoMaterno },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-xs">
                <label className="text-[13px] font-medium text-on-surface-variant">{label}</label>
                <input readOnly value={value}
                  className="text-[15px] bg-surface-container-high border border-outline-variant/50 rounded px-md py-sm text-on-secondary-fixed-variant cursor-not-allowed"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contacto y Académico */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant p-md">
        <h3 className="text-[15px] font-semibold text-on-surface mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
          Datos de Contacto y Académicos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div className="flex flex-col gap-xs md:col-span-2">
            <label className="text-[13px] font-medium text-on-surface-variant">Correo electrónico</label>
            <input
              type="email" value={gmail} onChange={(e) => setGmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="text-[15px] border border-outline-variant rounded-lg px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-surface-container-lowest"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="text-[13px] font-medium text-on-surface-variant">Región</label>
            <div className="flex items-center gap-sm px-md py-sm bg-surface-container border border-outline-variant rounded-lg text-[15px] cursor-not-allowed">
              <span className="material-symbols-outlined text-primary text-lg">location_on</span>
              <span className="text-on-surface font-medium">La Libertad</span>
              <span className="ml-auto text-[13px] bg-primary/10 text-primary px-sm py-xs rounded-full">Sede</span>
            </div>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="text-[13px] font-medium text-on-surface-variant">Especialidad / Carrera <span className="text-error">*</span></label>
            <select
              value={carreraId} onChange={(e) => setCarreraId(e.target.value)}
              className="text-[15px] border border-outline-variant rounded-lg px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-surface-container-lowest"
            >
              <option value="">Seleccionar del catálogo oficial CIP…</option>
              {carreras.map((c) => <option key={c.id} value={c.id}>Ing. {c.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Documentos */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant p-md">
        <h3 className="text-[15px] font-semibold text-on-surface mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>scanner</span>
          Subida de Documentación
        </h3>
        <div className="grid grid-cols-2 gap-md">
          {([
            { tipo: "foto" as const, ref: fotoRef, accept: "image/jpeg,image/png", estado: fotoEstado, icon: "add_a_photo", label: "Fotografía (3:4)", sub: "JPG/PNG" },
            { tipo: "titulo" as const, ref: tituloRef, accept: "application/pdf", estado: tituloEstado, icon: "picture_as_pdf", label: "Título Profesional", sub: "PDF Máx 10MB" },
          ]).map(({ tipo, ref, accept, estado, icon, label, sub }) => (
            <div key={tipo}>
              <input type="file" ref={ref} className="hidden" accept={accept}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) subirArchivo(f, tipo); }} />
              <button type="button" onClick={() => ref.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl p-md flex flex-col items-center justify-center min-h-[120px] text-center transition-colors group ${
                  estado === "listo" ? "border-status-aprobado-text/40 bg-status-aprobado-bg/20"
                  : estado === "error" ? "border-error/40 bg-error-container/20"
                  : "border-outline-variant bg-surface-bright hover:bg-surface-container-low"}`}
              >
                {estado === "subiendo" ? <><Spinner /><span className="text-[13px] text-on-surface-variant mt-sm">Subiendo...</span></>
                : estado === "listo" ? <><span className="material-symbols-outlined text-status-aprobado-text text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>task</span><span className="text-[13px] text-status-aprobado-text font-medium mt-xs">✓ Cargado</span></>
                : <><span className={`material-symbols-outlined text-[32px] text-on-surface-variant mb-xs group-hover:text-primary transition-colors`}>{icon}</span><p className="text-[15px] font-semibold text-on-surface mb-xs">{label}</p><p className="text-[13px] text-on-surface-variant">{sub}</p></>}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Registro de Pago */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant p-md">
        <h3 className="text-[15px] font-semibold text-on-surface mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
          Registro de Pago
        </h3>

        {/* Monto fijo */}
        <div className="bg-surface-container p-md rounded-lg border border-outline-variant mb-md flex justify-between items-center">
          <div>
            <p className="text-[15px] font-semibold text-on-surface">Cuota de Inscripción Ordinaria</p>
            <p className="text-[13px] text-on-surface-variant">Monto Fijo Institucional</p>
          </div>
          <span className="text-[28px] font-bold text-primary">S/ 1500.00</span>
        </div>

        {/* Tabs de método */}
        <div className="flex bg-surface-container p-1 rounded-lg mb-md">
          {([
            { key: "efectivo" as MetodoPagoNuevo, label: "Efectivo (Ventanilla)" },
            { key: "digital" as MetodoPagoNuevo, label: "Pasarela Digital" },
            { key: "voucher" as MetodoPagoNuevo, label: "Voucher Bancario" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setMetodoPago(key); setPagoRef(null); setVoucherUrl(null); setVoucherEstado("idle"); }}
              className={`flex-1 py-sm rounded-md text-[13px] font-medium transition-all ${
                metodoPago === key
                  ? "bg-surface-container-lowest text-primary font-semibold shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-lowest"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Efectivo */}
        {metodoPago === "efectivo" && (
          <div className="p-md border border-outline-variant rounded-xl bg-surface-container-lowest flex items-center gap-md">
            <span className="material-symbols-outlined text-primary text-3xl">point_of_sale</span>
            <p className="text-[15px] text-on-surface-variant">
              El pago se realizará directamente en la ventanilla de recaudación. Se registrará automáticamente al aprobar el expediente.
            </p>
          </div>
        )}

        {/* Pasarela Digital */}
        {metodoPago === "digital" && (
          <div className="mt-sm">
            {pagoRef ? (
              <div className="flex items-center gap-sm p-md bg-status-aprobado-bg border border-status-aprobado-text/30 rounded-xl">
                <span className="material-symbols-outlined text-status-aprobado-text text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-status-aprobado-text">Pago de S/ 1,500.00 completado</p>
                  <p className="text-[13px] text-on-surface-variant font-mono mt-xs">{pagoRef}</p>
                </div>
                <button type="button" onClick={() => setMostrarSimulador(true)}
                  className="text-[13px] text-primary underline hover:text-primary/80">
                  Cambiar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMostrarSimulador(true)}
                className="w-full flex items-center justify-center gap-sm p-md bg-primary text-on-primary rounded-xl hover:brightness-110 transition-all font-semibold text-[15px] shadow-sm"
              >
                <span className="material-symbols-outlined text-xl">account_balance</span>
                Proceder al pago — S/ 1,500.00
              </button>
            )}
          </div>
        )}

        {/* Voucher Bancario */}
        {metodoPago === "voucher" && (
          <div>
            <input type="file" ref={voucherRef} className="hidden" accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) subirArchivo(f, "voucher"); }} />
            <button type="button" onClick={() => voucherRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-xl p-lg flex flex-col items-center gap-sm transition-colors cursor-pointer ${
                voucherEstado === "listo" ? "border-status-aprobado-text/40 bg-status-aprobado-bg/20"
                : voucherEstado === "error" ? "border-error/40 bg-error-container/20"
                : "border-outline-variant bg-surface-bright hover:bg-surface-container-low"}`}
            >
              {voucherEstado === "subiendo" ? <><Spinner /><span className="text-[13px] text-on-surface-variant mt-sm">Subiendo...</span></>
              : voucherEstado === "listo" ? <><span className="material-symbols-outlined text-status-aprobado-text text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>task</span><span className="text-[13px] text-status-aprobado-text font-medium mt-xs">✓ Voucher cargado</span></>
              : <><span className="material-symbols-outlined text-[40px] text-on-surface-variant">cloud_upload</span><div className="text-center"><p className="text-[15px] font-semibold text-on-surface">Subir Voucher de Depósito/Transferencia</p><p className="text-[13px] text-on-surface-variant">JPG, PNG o PDF · Máx. 5MB</p></div></>}
            </button>
            {voucherEstado === "error" && <p className="text-error text-[13px] mt-sm">Error al subir. Intenta de nuevo.</p>}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-error-container border border-error/20 text-error rounded-lg px-md py-sm flex items-center gap-sm text-[15px]">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      <div className="flex gap-md justify-end">
        <button type="button" onClick={resetForm}
          className="border border-outline-variant text-on-surface text-[15px] font-semibold px-lg py-3 rounded-lg hover:bg-surface-container transition-colors">
          Limpiar
        </button>
        <button
          type="button"
          onClick={registrar}
          disabled={enviando}
          className="bg-primary text-on-primary text-[15px] font-semibold px-xl py-3 rounded-lg hover:brightness-110 transition-all shadow-sm flex items-center gap-sm disabled:opacity-60"
        >
          {enviando && <Spinner />}
          <span className="material-symbols-outlined text-xl">how_to_reg</span>
          Aprobar e Inscribir como Colegiado
        </button>
      </div>
    </div>
    </>
  );
}

// ── Tab: Terminal de Cobro ────────────────────────────────────────────────────

function formatPeriodo(periodo: string): string {
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const [anio, mes] = periodo.split("-");
  return `${meses[parseInt(mes) - 1]} ${anio}`;
}

function TabTerminalCobro() {
  const [query, setQuery] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [cuenta, setCuenta] = useState<EstadoCuenta | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  const [metodoCobro, setMetodoCobro] = useState<MetodoCobro>("efectivo");
  const [procesando, setProcesando] = useState(false);
  const [comprobanteId, setComprobanteId] = useState<string | null>(null);
  const [errorCobro, setErrorCobro] = useState<string | null>(null);

  const cuotasPendientes = cuenta?.mensualidades.filter((m) => m.pagadoEn === null) ?? [];
  const totalDeuda = cuenta?.totalDeuda ?? 0;

  async function consultar() {
    const q = query.trim();
    if (!q) return;
    setBuscando(true);
    setErrorBusqueda(null);
    setCuenta(null);
    try {
      const datos = await obtenerEstadoCuenta(q);
      setCuenta(datos);
    } catch {
      setErrorBusqueda("No se encontró ningún colegiado con el DNI o código CIP ingresado.");
    } finally {
      setBuscando(false);
    }
  }

  async function confirmarCobro() {
    if (!cuenta || cuotasPendientes.length === 0) return;
    setProcesando(true);
    setErrorCobro(null);
    try {
      const banco = metodoCobro === "efectivo" ? "VENTANILLA" : metodoCobro === "digital" ? "PASARELA" : "VOUCHER";
      const numeroOperacion = `VNT-${Date.now()}`;
      await registrarSimulacion({
        banco,
        numeroOperacion,
        tipo: "mensualidades",
        codigo: cuenta.colegiado.codigo,
        periodos: cuotasPendientes.map((m) => m.periodo),
      });
      setComprobanteId(`REC-${String(Date.now()).slice(-7)}`);
    } catch {
      setErrorCobro("Error al registrar el cobro. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  if (comprobanteId && cuenta) {
    return (
      <div className="flex flex-col items-center justify-center py-xl gap-lg text-center">
        <span className="material-symbols-outlined text-status-aprobado-text" style={{ fontSize: "72px", fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
        <h3 className="text-[24px] font-bold text-on-surface">Cobro Registrado</h3>
        <p className="text-[15px] text-on-surface-variant">
          Comprobante N° <strong className="text-on-surface">{comprobanteId}</strong> generado exitosamente.
        </p>
        <p className="text-[15px] text-on-surface-variant">
          Colegiado: <strong className="text-on-surface">{cuenta.colegiado.nombres} {cuenta.colegiado.apellidoPaterno}</strong>
        </p>
        <div className="flex gap-md">
          <button
            onClick={() => window.print()}
            className="border border-outline-variant text-on-surface text-[15px] font-semibold px-lg py-2.5 rounded-lg hover:bg-surface-container transition-colors flex items-center gap-sm"
          >
            <span className="material-symbols-outlined">print</span>
            Imprimir Comprobante
          </button>
          <button
            onClick={() => { setComprobanteId(null); setCuenta(null); setQuery(""); }}
            className="bg-primary text-on-primary text-[15px] font-semibold px-lg py-2.5 rounded-lg hover:brightness-110 transition-all"
          >
            Nuevo Cobro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      {/* Buscador */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm flex gap-md items-center">
        <span className="material-symbols-outlined text-on-surface-variant ml-sm">point_of_sale</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && consultar()}
          placeholder="Ingresar DNI o Código CIP para consultar deuda..."
          className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-on-surface text-[20px] font-semibold placeholder:text-surface-dim"
        />
        <button
          type="button"
          onClick={consultar}
          disabled={buscando || !query.trim()}
          className="px-lg py-md bg-surface-container-highest text-on-surface text-[15px] font-semibold rounded-lg hover:bg-secondary-container transition-colors border border-outline-variant flex items-center gap-sm disabled:opacity-60"
        >
          {buscando && <Spinner />}
          Consultar
        </button>
      </div>

      {errorBusqueda && (
        <div className="bg-error-container border border-error/20 text-error rounded-xl px-lg py-md flex items-center gap-md text-[15px]">
          <span className="material-symbols-outlined">search_off</span>
          {errorBusqueda}
        </div>
      )}

      {cuenta && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          {/* Izquierda: Deuda */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col">
            <div className="border-b border-outline-variant pb-md mb-md flex justify-between items-start">
              <div>
                <h3 className="text-[20px] font-semibold text-on-surface">
                  {cuenta.colegiado.nombres} {cuenta.colegiado.apellidoPaterno} {cuenta.colegiado.apellidoMaterno}
                </h3>
                <p className="text-[15px] text-on-surface-variant">
                  CIP: {cuenta.colegiado.codigo} · {cuenta.colegiado.carrera.nombre}
                </p>
              </div>
              {cuotasPendientes.length > 0 ? (
                <span className="px-sm py-xs bg-status-pendiente-bg text-status-pendiente-text rounded-lg text-[13px] font-bold shrink-0">
                  Deuda Pendiente
                </span>
              ) : (
                <span className="px-sm py-xs bg-status-aprobado-bg text-status-aprobado-text rounded-lg text-[13px] font-bold shrink-0">
                  Al Día
                </span>
              )}
            </div>

            <div className="flex-1">
              <h4 className="text-[13px] font-semibold text-on-surface-variant mb-sm uppercase tracking-wide">
                Mensualidades Pendientes
              </h4>

              {cuotasPendientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-lg gap-sm text-center">
                  <span className="material-symbols-outlined text-status-aprobado-text" style={{ fontSize: "48px", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <p className="text-[15px] text-on-surface-variant">No tiene cuotas pendientes.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-sm bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm mb-md">
                    <span className="material-symbols-outlined text-base text-on-surface-variant mt-xs">info</span>
                    <p className="text-[13px] text-on-surface-variant">
                      Las mensualidades se cobran en orden cronológico.
                    </p>
                  </div>
                  <div className="space-y-sm">
                    {cuotasPendientes.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-md p-md border border-outline-variant rounded-lg bg-surface-bright"
                      >
                        <span className="material-symbols-outlined text-primary">radio_button_checked</span>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="text-[15px] font-semibold text-on-surface">
                              Mensualidad — {formatPeriodo(m.periodo)}
                            </span>
                            <span className="text-[15px] font-semibold text-on-surface tabular-nums">
                              S/ {m.monto.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Derecha: Resumen de cobro */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-[20px] font-semibold text-on-surface mb-lg flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary">receipt</span>
                Resumen de Cobro
              </h3>

              <div className="bg-surface-container-lowest p-lg border border-dashed border-outline-variant rounded-lg mb-lg">
                <div className="flex justify-between mb-sm text-[15px] text-on-surface-variant">
                  <span>Subtotal</span>
                  <span className="tabular-nums">S/ {totalDeuda.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-md text-[15px] text-on-surface-variant">
                  <span>IGV (18%)</span>
                  <span>S/ 0.00</span>
                </div>
                <div className="border-t border-outline-variant pt-md flex justify-between text-[24px] font-bold text-on-surface">
                  <span>Total a Cobrar</span>
                  <span className="tabular-nums">S/ {totalDeuda.toFixed(2)}</span>
                </div>
              </div>

              {/* Método de cobro */}
              <h4 className="text-[13px] font-semibold text-on-surface-variant mb-sm uppercase tracking-wide">
                Método de Cobro
              </h4>
              <div className="flex bg-surface-container-low p-1 rounded-lg mb-md">
                {([
                  { key: "efectivo" as MetodoCobro, label: "Efectivo" },
                  { key: "digital" as MetodoCobro, label: "Pasarela Digital" },
                  { key: "voucher" as MetodoCobro, label: "Voucher Bancario" },
                ] as { key: MetodoCobro; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMetodoCobro(key)}
                    className={`flex-1 py-sm rounded-md text-[13px] font-medium transition-all ${
                      metodoCobro === key
                        ? "bg-surface-container-lowest text-primary font-semibold shadow-sm"
                        : "text-on-surface-variant hover:bg-surface-container-lowest"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {metodoCobro === "efectivo" && (
                <div className="p-md border border-outline-variant rounded-xl bg-surface-container-lowest flex items-center gap-md">
                  <span className="material-symbols-outlined text-primary text-3xl">point_of_sale</span>
                  <p className="text-[15px] text-on-surface-variant">
                    El pago se realizará directamente en la ventanilla de recaudación.
                  </p>
                </div>
              )}
              {metodoCobro === "digital" && (
                <div className="p-md border border-outline-variant rounded-xl bg-surface-container-lowest flex items-center gap-md">
                  <span className="material-symbols-outlined text-primary text-3xl">credit_card</span>
                  <p className="text-[15px] text-on-surface-variant">
                    Se habilitará el terminal POS o link de pago para transacción inmediata.
                  </p>
                </div>
              )}
              {metodoCobro === "voucher" && (
                <div className="p-md border border-outline-variant rounded-xl bg-surface-container-lowest flex items-center gap-md">
                  <span className="material-symbols-outlined text-primary text-3xl">upload_file</span>
                  <p className="text-[15px] text-on-surface-variant">
                    Se registrará el voucher bancario del colegiado.
                  </p>
                </div>
              )}
            </div>

            {errorCobro && (
              <div className="bg-error-container border border-error/20 text-error rounded-lg px-md py-sm flex items-center gap-sm text-[15px] mt-md">
                <span className="material-symbols-outlined">error</span>
                {errorCobro}
              </div>
            )}

            <div className="mt-lg flex flex-col gap-md">
              <button
                type="button"
                onClick={confirmarCobro}
                disabled={procesando || cuotasPendientes.length === 0}
                className="w-full py-lg bg-primary text-on-primary text-[20px] font-bold rounded-xl hover:brightness-110 transition-all shadow-md flex items-center justify-center gap-sm disabled:opacity-60"
              >
                {procesando ? <Spinner /> : <span className="material-symbols-outlined text-3xl">local_atm</span>}
                {procesando ? "Procesando..." : `Confirmar Cobro S/ ${totalDeuda.toFixed(2)} e Imprimir`}
              </button>
              <p className="text-center text-[13px] text-on-surface-variant">
                Se generará y descargará automáticamente el Comprobante PDF.
              </p>
            </div>
          </div>
        </div>
      )}

      {!cuenta && !errorBusqueda && !buscando && (
        <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
          <span className="material-symbols-outlined text-outline" style={{ fontSize: "56px" }}>point_of_sale</span>
          <p className="text-[15px] text-on-surface-variant max-w-xs">
            Ingresa el DNI o código CIP del colegiado para consultar su deuda pendiente.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function VentanillaPage() {
  const [tab, setTab] = useState<TabActiva>("nuevo");

  const tabs: { key: TabActiva; label: string; icon: string }[] = [
    { key: "nuevo", label: "Nuevo Expediente Físico", icon: "folder_open" },
    { key: "cobro", label: "Terminal de Cobro", icon: "point_of_sale" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Cabecera */}
      <header className="bg-surface border-b border-outline-variant px-lg py-md shrink-0 flex justify-between items-end">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Módulo de Ventanilla — Sede: Lima</h1>
          <p className="font-body-base text-body-base text-on-surface-variant mt-xs">Atención presencial y recepción de expedientes.</p>
        </div>
        <div className="flex items-center gap-xs px-md py-sm bg-status-aprobado-bg text-status-aprobado-text rounded-full font-label-sm text-label-sm border border-status-aprobado-text/20 shrink-0">
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          Caja Abierta
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-surface border-b border-outline-variant px-lg flex gap-sm shrink-0">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-sm px-md py-md font-body-medium text-body-medium border-b-2 transition-colors ${
              tab === key
                ? "border-primary text-primary font-body-bold"
                : "border-transparent text-on-surface-variant hover:text-primary hover:border-primary/30"
            }`}
          >
            <span className="material-symbols-outlined text-xl">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-lg">
        <div className="max-w-container-admin mx-auto">
          {tab === "nuevo" && <TabNuevoExpediente />}
          {tab === "cobro" && <TabTerminalCobro />}
        </div>
      </div>
    </div>
  );
}
