"use client";

import { useState, useRef, useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { consultarDNI, crearPostulacion, getRegiones, getCarreras } from "@/lib/api";
import { subirImagen, subirPDF } from "@/lib/cloudinary";
import type { Region, Carrera } from "@/types";

type TabActiva = "nuevo" | "subsanacion" | "cobro";

// ── Tab: Nuevo Expediente Físico ──────────────────────────────────────────────

function TabNuevoExpediente() {
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [dni, setDni] = useState("");
  const [buscandoDNI, setBuscandoDNI] = useState(false);
  const [dniVerificado, setDniVerificado] = useState(false);
  const [nombres, setNombres] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [gmail, setGmail] = useState("");
  const [regionId, setRegionId] = useState("");
  const [carreraId, setCarreraId] = useState("");
  const [errorDNI, setErrorDNI] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fotoRef = useRef<HTMLInputElement>(null);
  const tituloRef = useRef<HTMLInputElement>(null);

  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoEstado, setFotoEstado] = useState<"idle" | "subiendo" | "listo" | "error">("idle");
  const [tituloUrl, setTituloUrl] = useState<string | null>(null);
  const [tituloEstado, setTituloEstado] = useState<"idle" | "subiendo" | "listo" | "error">("idle");

  useEffect(() => {
    Promise.all([getRegiones(), getCarreras()])
      .then(([r, c]) => {
        setRegiones(r);
        setCarreras(c);
      })
      .catch(() => {
        setRegiones([
          { id: 1, nombre: "Lima" }, { id: 2, nombre: "Arequipa" },
          { id: 3, nombre: "Cusco" }, { id: 4, nombre: "La Libertad" },
        ]);
        setCarreras([
          { id: 1, nombre: "Civil" }, { id: 2, nombre: "Sistemas" },
          { id: 3, nombre: "Industrial" }, { id: 4, nombre: "Mecánica" },
        ]);
      });
  }, []);

  async function validarDNI() {
    if (!/^\d{8}$/.test(dni)) {
      setErrorDNI("Ingresa 8 dígitos numéricos");
      return;
    }
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

  async function subirArchivo(
    file: File,
    tipo: "foto" | "titulo"
  ) {
    if (tipo === "foto") setFotoEstado("subiendo");
    else setTituloEstado("subiendo");

    try {
      const url = file.type === "application/pdf"
        ? await subirPDF(file)
        : await subirImagen(file);
      if (tipo === "foto") { setFotoUrl(url); setFotoEstado("listo"); }
      else { setTituloUrl(url); setTituloEstado("listo"); }
    } catch {
      if (tipo === "foto") setFotoEstado("error");
      else setTituloEstado("error");
    }
  }

  async function registrar() {
    if (!dniVerificado || !fotoUrl || !tituloUrl || !gmail || !regionId || !carreraId) {
      setError("Complete todos los campos y suba los documentos antes de registrar.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const result = await crearPostulacion({
        dni,
        nombres,
        apellidoPaterno,
        apellidoMaterno,
        gmail,
        regionId: Number(regionId),
        carreraId: Number(carreraId),
        fotoUrl,
        tituloUrl,
      });
      setExito(result.id);
    } catch {
      setError("Error al registrar el expediente. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
        <span className="material-symbols-outlined text-status-aprobado-text" style={{ fontSize: "56px", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        <h3 className="text-[20px] font-semibold text-on-surface">Expediente registrado</h3>
        <p className="text-[15px] text-on-surface-variant">Expediente N° <strong>{exito}</strong> creado exitosamente.</p>
        <button
          onClick={() => { setExito(null); setDni(""); setDniVerificado(false); setNombres(""); setApellidoPaterno(""); setApellidoMaterno(""); setGmail(""); setRegionId(""); setCarreraId(""); setFotoUrl(null); setFotoEstado("idle"); setTituloUrl(null); setTituloEstado("idle"); }}
          className="bg-primary text-on-primary px-lg py-2.5 rounded-lg text-[15px] font-semibold hover:brightness-110 transition-all"
        >
          Nuevo expediente
        </button>
      </div>
    );
  }

  return (
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
                <input
                  readOnly
                  value={value}
                  className="text-[15px] bg-surface-container-high border border-outline-variant/50 rounded px-md py-sm text-on-secondary-fixed-variant cursor-not-allowed"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contacto y datos académicos */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant p-md">
        <h3 className="text-[15px] font-semibold text-on-surface mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
          Datos de Contacto y Académicos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div className="flex flex-col gap-xs">
            <label className="text-[13px] font-medium text-on-surface-variant">Correo electrónico</label>
            <input
              type="email"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="text-[15px] border border-outline-variant rounded-lg px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-surface-container-lowest"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="text-[13px] font-medium text-on-surface-variant">Región</label>
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="text-[15px] border border-outline-variant rounded-lg px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-surface-container-lowest"
            >
              <option value="">Selecciona...</option>
              {regiones.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="text-[13px] font-medium text-on-surface-variant">Carrera</label>
            <select
              value={carreraId}
              onChange={(e) => setCarreraId(e.target.value)}
              className="text-[15px] border border-outline-variant rounded-lg px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-surface-container-lowest"
            >
              <option value="">Selecciona...</option>
              {carreras.map((c) => <option key={c.id} value={c.id}>Ing. {c.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Documentos */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant p-md">
        <h3 className="text-[15px] font-semibold text-on-surface mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>upload_file</span>
          Documentos
        </h3>
        <div className="grid grid-cols-2 gap-md">
          {/* Foto */}
          <div>
            <input type="file" ref={fotoRef} className="hidden" accept="image/jpeg,image/png"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) subirArchivo(f, "foto"); }} />
            <button type="button" onClick={() => fotoRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-lg p-md text-center flex flex-col items-center justify-center min-h-[120px] transition-colors ${
                fotoEstado === "listo" ? "border-status-aprobado-text/40 bg-status-aprobado-bg/20"
                : fotoEstado === "error" ? "border-error/40 bg-error-container/20"
                : "border-outline-variant bg-surface-bright hover:bg-surface-container-low"}`}
            >
              {fotoEstado === "subiendo" ? <><Spinner /><span className="text-[13px] text-on-surface-variant mt-sm">Subiendo...</span></>
              : fotoEstado === "listo" ? <><span className="material-symbols-outlined text-status-aprobado-text text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>task</span><span className="text-[13px] text-status-aprobado-text font-medium mt-xs">✓ Foto cargada</span></>
              : <><span className="material-symbols-outlined text-outline text-3xl mb-xs">add_a_photo</span><span className="text-[13px] text-on-surface-variant">Subir Fotografía (JPG/PNG)</span></>}
            </button>
          </div>
          {/* Título */}
          <div>
            <input type="file" ref={tituloRef} className="hidden" accept="application/pdf"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) subirArchivo(f, "titulo"); }} />
            <button type="button" onClick={() => tituloRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-lg p-md text-center flex flex-col items-center justify-center min-h-[120px] transition-colors ${
                tituloEstado === "listo" ? "border-status-aprobado-text/40 bg-status-aprobado-bg/20"
                : tituloEstado === "error" ? "border-error/40 bg-error-container/20"
                : "border-outline-variant bg-surface-bright hover:bg-surface-container-low"}`}
            >
              {tituloEstado === "subiendo" ? <><Spinner /><span className="text-[13px] text-on-surface-variant mt-sm">Subiendo...</span></>
              : tituloEstado === "listo" ? <><span className="material-symbols-outlined text-status-aprobado-text text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>task</span><span className="text-[13px] text-status-aprobado-text font-medium mt-xs">✓ Título cargado</span></>
              : <><span className="material-symbols-outlined text-outline text-3xl mb-xs">description</span><span className="text-[13px] text-on-surface-variant">Subir Título Profesional (PDF)</span></>}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-error-container border border-error/20 text-error rounded-lg px-md py-sm flex items-center gap-sm text-[15px]">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={registrar}
          disabled={enviando}
          className="bg-primary text-on-primary text-[15px] font-semibold px-xl py-3 rounded-lg hover:brightness-110 transition-all shadow-sm flex items-center gap-sm disabled:opacity-60"
        >
          {enviando && <Spinner />}
          <span className="material-symbols-outlined text-xl">save</span>
          Registrar Expediente
        </button>
      </div>
    </div>
  );
}

// ── Tab: Subsanación Presencial ───────────────────────────────────────────────

function TabSubsanacion() {
  return (
    <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
      <span className="material-symbols-outlined text-outline" style={{ fontSize: "56px" }}>
        edit_document
      </span>
      <h3 className="text-[20px] font-semibold text-on-surface">Subsanación Presencial</h3>
      <p className="text-[15px] text-on-surface-variant max-w-sm">
        Módulo para procesar la corrección de expedientes observados de manera presencial.
        Disponible en la próxima versión.
      </p>
    </div>
  );
}

// ── Tab: Terminal de Cobro ────────────────────────────────────────────────────

function TabTerminalCobro() {
  const [dni, setDni] = useState("");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("Derecho de inscripción");
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "digital" | "pos">("efectivo");
  const [procesando, setProcesando] = useState(false);
  const [comprobante, setComprobante] = useState<string | null>(null);

  async function procesarCobro() {
    if (!dni || !monto || isNaN(Number(monto))) return;
    setProcesando(true);
    await new Promise((r) => setTimeout(r, 1500));
    const num = String(Date.now()).slice(-6);
    setComprobante(`REC-${num}`);
    setProcesando(false);
  }

  if (comprobante) {
    return (
      <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
        <span className="material-symbols-outlined text-status-aprobado-text" style={{ fontSize: "56px", fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
        <h3 className="text-[20px] font-semibold text-on-surface">Cobro Registrado</h3>
        <p className="text-[15px] text-on-surface-variant">
          Comprobante N° <strong className="text-on-surface">{comprobante}</strong> generado.
        </p>
        <div className="flex gap-md">
          <button
            onClick={() => window.print()}
            className="border border-outline-variant text-on-surface text-[15px] font-semibold px-lg py-2.5 rounded-lg hover:bg-surface-container transition-colors flex items-center gap-sm"
          >
            <span className="material-symbols-outlined">print</span>
            Imprimir
          </button>
          <button
            onClick={() => { setComprobante(null); setDni(""); setMonto(""); }}
            className="bg-primary text-on-primary text-[15px] font-semibold px-lg py-2.5 rounded-lg hover:brightness-110 transition-all"
          >
            Nuevo cobro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-md max-w-lg">
      <div className="bg-surface-container-low rounded-xl border border-outline-variant p-md">
        <h3 className="text-[15px] font-semibold text-on-surface mb-md">Datos del Cobro</h3>
        <div className="space-y-md">
          <div className="flex flex-col gap-xs">
            <label className="text-[13px] font-medium text-on-surface-variant">DNI del Colegiado</label>
            <input
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="12345678"
              className="text-[15px] border border-outline-variant rounded-lg px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="text-[13px] font-medium text-on-surface-variant">Concepto</label>
            <select
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="text-[15px] border border-outline-variant rounded-lg px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest"
            >
              <option>Derecho de inscripción</option>
              <option>Cuotas ordinarias</option>
              <option>Constancias y certificados</option>
              <option>Carnet de colegiado</option>
            </select>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="text-[13px] font-medium text-on-surface-variant">Monto (S/)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="text-[15px] border border-outline-variant rounded-lg px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest"
            />
          </div>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-xl border border-outline-variant p-md">
        <h3 className="text-[15px] font-semibold text-on-surface mb-md">Método de Cobro</h3>
        <div className="grid grid-cols-3 gap-sm">
          {[
            { value: "efectivo" as const, label: "Efectivo", icon: "payments" },
            { value: "digital" as const, label: "Digital / QR", icon: "qr_code" },
            { value: "pos" as const, label: "Terminal POS", icon: "point_of_sale" },
          ].map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMetodoPago(value)}
              className={`border-2 rounded-xl p-md flex flex-col items-center gap-sm transition-all ${
                metodoPago === value
                  ? "border-primary bg-primary-fixed/20"
                  : "border-outline-variant bg-surface-bright hover:border-primary/50"
              }`}
            >
              <span className="material-symbols-outlined text-primary text-3xl">{icon}</span>
              <span className="text-[13px] font-medium text-on-surface">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-[13px] text-on-surface-variant">Total a cobrar:</p>
          <p className="text-[24px] font-bold text-primary">S/ {Number(monto || 0).toFixed(2)}</p>
        </div>
        <button
          type="button"
          onClick={procesarCobro}
          disabled={procesando || !dni || !monto}
          className="bg-primary text-on-primary text-[15px] font-semibold px-xl py-3 rounded-lg hover:brightness-110 transition-all shadow-sm flex items-center gap-sm disabled:opacity-60"
        >
          {procesando && <Spinner />}
          <span className="material-symbols-outlined text-xl">point_of_sale</span>
          Procesar Cobro
        </button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function VentanillaPage() {
  const [tab, setTab] = useState<TabActiva>("nuevo");

  const tabs: { key: TabActiva; label: string; icon: string }[] = [
    { key: "nuevo", label: "Nuevo Expediente Físico", icon: "folder_open" },
    { key: "subsanacion", label: "Subsanación Presencial", icon: "edit_document" },
    { key: "cobro", label: "Terminal de Cobro", icon: "point_of_sale" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Cabecera */}
      <header className="bg-surface-container-lowest border-b border-outline-variant px-lg py-md shrink-0">
        <h1 className="text-[20px] font-semibold text-on-surface">Módulo de Ventanilla</h1>
        <p className="text-[13px] text-on-surface-variant">Atención presencial e ingreso de expedientes físicos</p>
      </header>

      {/* Tabs */}
      <div className="bg-surface border-b border-outline-variant px-lg flex gap-sm shrink-0">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-sm px-md py-md text-[15px] font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-primary text-primary"
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
          {tab === "subsanacion" && <TabSubsanacion />}
          {tab === "cobro" && <TabTerminalCobro />}
        </div>
      </div>
    </div>
  );
}
