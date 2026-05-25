"use client";

import { useState, useRef, useEffect } from "react";
import { NavBar } from "@/components/ui/NavBar";
import { Spinner } from "@/components/ui/Spinner";
import { subirImagen, subirPDF } from "@/lib/cloudinary";
import {
  buscarPostulacionPorDNI,
  subsanarPostulacion,
  obtenerSubsanacionPorToken,
  procesarSubsanacion,
} from "@/lib/api";
import type { PostulacionDetalle } from "@/types";

type EstadoArchivo = "idle" | "subiendo" | "listo" | "error";

export default function SubsanacionPage() {
  const [token, setToken] = useState<string | null>(null);
  const [dni, setDni] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [postulacion, setPostulacion] = useState<PostulacionDetalle | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [camposObservados, setCamposObservados] = useState<string[]>([]);

  const fotoRef = useRef<HTMLInputElement>(null);
  const tituloRef = useRef<HTMLInputElement>(null);
  const voucherRef = useRef<HTMLInputElement>(null);
  const [nuevaFotoUrl, setNuevaFotoUrl] = useState<string | null>(null);
  const [nuevoTituloUrl, setNuevoTituloUrl] = useState<string | null>(null);
  const [nuevoVoucherUrl, setNuevoVoucherUrl] = useState<string | null>(null);
  const [fotoEstado, setFotoEstado] = useState<EstadoArchivo>("idle");
  const [tituloEstado, setTituloEstado] = useState<EstadoArchivo>("idle");
  const [voucherEstado, setVoucherEstado] = useState<EstadoArchivo>("idle");

  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  // Detectar token en la URL al montar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
      cargarPorToken(t);
    }
  }, []);

  async function cargarPorToken(t: string) {
    setBuscando(true);
    setErrorBusqueda(null);
    try {
      const data = await obtenerSubsanacionPorToken(t);
      setPostulacion(data);
      const ultimaObs = data.observaciones[0];
      setCamposObservados(ultimaObs?.camposObservados ?? ["foto", "titulo"]);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Enlace no válido o expirado.";
      setErrorBusqueda(msg);
    } finally {
      setBuscando(false);
    }
  }

  async function buscarPorDNI() {
    const q = dni.trim();
    if (!/^\d{8}$/.test(q)) {
      setErrorBusqueda("Ingresa un DNI de 8 dígitos.");
      return;
    }
    setBuscando(true);
    setErrorBusqueda(null);
    setPostulacion(null);
    try {
      const data = await buscarPostulacionPorDNI(q);
      if (data.estado !== "OBSERVADO") {
        setErrorBusqueda(
          ["PENDIENTE", "SUBSANADO"].includes(data.estado)
            ? "Tu expediente está en revisión. No requiere subsanación en este momento."
            : "No se encontró un expediente observado para ese DNI."
        );
      } else {
        setPostulacion(data);
        const ultimaObs = data.observaciones[0];
        setCamposObservados(ultimaObs?.camposObservados ?? ["foto", "titulo"]);
      }
    } catch {
      setErrorBusqueda("No se encontró ningún expediente activo para ese DNI.");
    } finally {
      setBuscando(false);
    }
  }

  async function subirArchivo(file: File, tipo: "foto" | "titulo" | "voucher") {
    if (tipo === "foto") setFotoEstado("subiendo");
    else if (tipo === "titulo") setTituloEstado("subiendo");
    else setVoucherEstado("subiendo");
    try {
      const url = file.type === "application/pdf" ? await subirPDF(file) : await subirImagen(file);
      if (tipo === "foto") { setNuevaFotoUrl(url); setFotoEstado("listo"); }
      else if (tipo === "titulo") { setNuevoTituloUrl(url); setTituloEstado("listo"); }
      else { setNuevoVoucherUrl(url); setVoucherEstado("listo"); }
    } catch {
      if (tipo === "foto") setFotoEstado("error");
      else if (tipo === "titulo") setTituloEstado("error");
      else setVoucherEstado("error");
    }
  }

  async function reenviarExpediente() {
    if (!postulacion) return;
    if (!nuevaFotoUrl && !nuevoTituloUrl && !nuevoVoucherUrl) {
      setErrorEnvio("Debes corregir al menos un documento antes de reenviar.");
      return;
    }
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const body = {
        ...(nuevaFotoUrl && { fotoUrl: nuevaFotoUrl }),
        ...(nuevoTituloUrl && { tituloUrl: nuevoTituloUrl }),
        ...(nuevoVoucherUrl && { voucherUrl: nuevoVoucherUrl }),
      };
      if (token) {
        await procesarSubsanacion(token, body);
      } else {
        await subsanarPostulacion(postulacion.id, body);
      }
      setExito(true);
    } catch {
      setErrorEnvio("Error al reenviar el expediente. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const mostrarFoto = camposObservados.includes("foto");
  const mostrarTitulo = camposObservados.includes("titulo");
  const mostrarVoucher = camposObservados.includes("voucher");

  if (buscando && token) {
    return (
      <>
        <NavBar activeTab="portal" />
        <main className="flex-grow flex items-center justify-center gap-md text-on-surface-variant">
          <Spinner />
          <span className="font-body-base text-body-base">Cargando tu expediente...</span>
        </main>
      </>
    );
  }

  if (exito) {
    return (
      <>
        <NavBar activeTab="portal" />
        <main className="flex-grow w-full max-w-container-admin mx-auto px-md md:px-lg py-xl flex flex-col items-center justify-center gap-lg text-center">
          <span className="material-symbols-outlined text-status-aprobado-text" style={{ fontSize: "72px", fontVariationSettings: "'FILL' 1" }}>
            task_alt
          </span>
          <h2 className="font-headline-md text-headline-md text-on-surface">¡Expediente reenviado!</h2>
          <p className="font-body-base text-body-base text-on-surface-variant max-w-sm">
            Tu expediente fue reenviado con los documentos corregidos. El revisor lo evaluará nuevamente en las próximas 24–48 horas.
          </p>
          <a href="/" className="bg-primary text-on-primary px-xl py-sm rounded-lg font-body-bold text-body-bold hover:brightness-110 transition-all">
            Volver al inicio
          </a>
        </main>
      </>
    );
  }

  return (
    <>
      <NavBar activeTab="portal" />
      <main className="flex-grow w-full max-w-container-admin mx-auto px-md md:px-lg py-xl flex flex-col gap-xl">

        {/* Header */}
        <section className="w-full max-w-[672px] mx-auto">
          <div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant flex flex-col gap-md">
            <h1 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-status-observado-text">warning</span>
              Subsanación de Expediente Observado
            </h1>
            <p className="font-body-base text-body-base text-on-surface-variant">
              Corrija únicamente los campos señalados y reenvíe sin cargo adicional.
            </p>
          </div>
        </section>

        {/* Error de token/búsqueda */}
        {errorBusqueda && !postulacion && (
          <section className="w-full max-w-[672px] mx-auto">
            <div className="bg-error-container border border-error/20 text-error rounded-lg px-md py-sm flex items-center gap-sm font-body-base text-body-base">
              <span className="material-symbols-outlined">error</span>
              {errorBusqueda}
            </div>
          </section>
        )}

        {/* Búsqueda por DNI — solo si no viene por token */}
        {!token && !postulacion && (
          <section className="w-full max-w-[672px] mx-auto">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
              <h2 className="font-body-bold text-body-bold text-on-surface mb-md">Consultar Expediente por DNI</h2>
              <div className="flex gap-sm">
                <div className="relative flex-grow">
                  <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-secondary">badge</span>
                  <input
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    onKeyDown={(e) => e.key === "Enter" && buscarPorDNI()}
                    placeholder="Ingresa tu DNI (8 dígitos)"
                    maxLength={8}
                    className="w-full pl-xl pr-sm py-sm border border-outline-variant rounded-lg bg-surface focus:ring-2 focus:ring-primary focus:border-primary text-on-surface font-body-base text-body-base outline-none transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={buscarPorDNI}
                  disabled={buscando || dni.length !== 8}
                  className="flex items-center gap-xs px-lg py-sm bg-primary text-on-primary rounded-lg font-body-bold text-body-bold hover:brightness-110 transition-all disabled:opacity-60"
                >
                  {buscando ? <Spinner /> : <span className="material-symbols-outlined text-xl">search</span>}
                  Buscar
                </button>
              </div>
            </div>
          </section>
        )}

        {postulacion && (
          <>
            {/* Info del expediente */}
            <section className="w-full max-w-[672px] mx-auto">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Número de Expediente</p>
                  <p className="font-body-bold text-body-bold text-on-surface mb-lg">
                    #CIP-{postulacion.creadoEn.slice(0, 4)}-{String(postulacion.id).padStart(4, "0")}
                  </p>
                  <div className="grid grid-cols-2 gap-lg">
                    <div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">DNI</p>
                      <p className="font-body-bold text-body-bold text-on-surface">{postulacion.dni}</p>
                    </div>
                    <div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Nombre</p>
                      <p className="font-body-bold text-body-bold text-on-surface">
                        {postulacion.nombres} {postulacion.apellidoPaterno}
                      </p>
                    </div>
                  </div>
                </div>
                <span className="inline-block px-md py-sm bg-status-observado-bg text-status-observado-text rounded-full font-label-sm text-label-sm font-bold">
                  Observado
                </span>
              </div>
            </section>

            {/* Observaciones del revisor */}
            {postulacion.observaciones.length > 0 && (
              <section className="w-full max-w-[672px] mx-auto">
                <div className="bg-status-observado-bg border border-status-observado-text/20 rounded-xl p-md">
                  <h4 className="font-label-sm text-label-sm font-semibold text-status-observado-text mb-sm flex items-center gap-xs">
                    <span className="material-symbols-outlined text-base">info</span>
                    Observaciones del Revisor:
                  </h4>
                  <ul className="space-y-xs">
                    {postulacion.observaciones.slice(0, 3).map((obs) => (
                      <li key={obs.id} className="font-label-sm text-label-sm text-on-surface-variant">• {obs.mensaje}</li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Campos observados — EDITABLES */}
            <section className="w-full max-w-[672px] mx-auto">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
                <div className="bg-surface border-b border-outline-variant px-lg py-md">
                  <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
                    <span className="material-symbols-outlined text-status-observado-text">assignment_late</span>
                    Campos Observados (Editable)
                  </h2>
                </div>
                <div className="p-lg flex flex-col gap-lg">

                  {/* Título Profesional */}
                  {mostrarTitulo && (
                    <div className="border border-status-observado-text/30 rounded-lg p-md bg-status-observado-bg/30">
                      <div className="flex items-start gap-md mb-md">
                        <span className="material-symbols-outlined text-status-observado-text mt-xs">info</span>
                        <div className="flex-1">
                          <h4 className="font-body-bold text-body-bold text-on-surface mb-xs">Título Profesional (PDF)</h4>
                          <p className="font-body-base text-body-base text-on-surface-variant">Cargue nuevamente su título en formato PDF claro y legible.</p>
                        </div>
                      </div>
                      <input type="file" ref={tituloRef} className="hidden" accept="application/pdf"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) subirArchivo(f, "titulo"); }} />
                      <button type="button" onClick={() => tituloRef.current?.click()}
                        className={`w-full border-2 border-dashed rounded-xl p-lg flex flex-col items-center gap-sm transition-colors cursor-pointer ${
                          tituloEstado === "listo" ? "border-status-aprobado-text/40 bg-status-aprobado-bg/20"
                          : tituloEstado === "error" ? "border-error/40 bg-error-container/20"
                          : "border-status-observado-text bg-surface-container-lowest hover:bg-surface-bright"}`}>
                        {tituloEstado === "subiendo" ? (
                          <><Spinner /><span className="font-label-sm text-label-sm text-on-surface-variant mt-sm">Subiendo...</span></>
                        ) : tituloEstado === "listo" ? (
                          <>
                            <span className="material-symbols-outlined text-status-aprobado-text" style={{ fontSize: "36px", fontVariationSettings: "'FILL' 1" }}>task</span>
                            <p className="font-body-bold text-body-bold text-status-aprobado-text">✓ Título cargado</p>
                            <p className="font-label-sm text-label-sm text-on-surface-variant">Haz clic para reemplazar</p>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-status-observado-text" style={{ fontSize: "36px" }}>picture_as_pdf</span>
                            <p className="font-body-bold text-body-bold text-on-surface">Subir Título Profesional Corregido</p>
                            <p className="font-label-sm text-label-sm text-on-surface-variant">PDF · Máx. 10 MB</p>
                          </>
                        )}
                      </button>
                      {tituloEstado === "error" && <p className="text-error font-label-sm text-label-sm mt-sm">Error al subir. Intenta de nuevo.</p>}
                    </div>
                  )}

                  {/* Fotografía */}
                  {mostrarFoto && (
                    <div className="border border-status-observado-text/30 rounded-lg p-md bg-status-observado-bg/30">
                      <div className="flex items-start gap-md mb-md">
                        <span className="material-symbols-outlined text-status-observado-text mt-xs">info</span>
                        <div className="flex-1">
                          <h4 className="font-body-bold text-body-bold text-on-surface mb-xs">Fotografía (JPG/PNG · Proporción 3:4)</h4>
                          <p className="font-body-base text-body-base text-on-surface-variant">Fondo blanco, sin accesorios, rostro centrado.</p>
                        </div>
                      </div>
                      <input type="file" ref={fotoRef} className="hidden" accept="image/jpeg,image/png"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) subirArchivo(f, "foto"); }} />
                      <button type="button" onClick={() => fotoRef.current?.click()}
                        className={`w-full border-2 border-dashed rounded-xl p-lg flex flex-col items-center gap-sm transition-colors cursor-pointer ${
                          fotoEstado === "listo" ? "border-status-aprobado-text/40 bg-status-aprobado-bg/20"
                          : fotoEstado === "error" ? "border-error/40 bg-error-container/20"
                          : "border-status-observado-text bg-surface-container-lowest hover:bg-surface-bright"}`}>
                        {fotoEstado === "subiendo" ? (
                          <><Spinner /><span className="font-label-sm text-label-sm text-on-surface-variant mt-sm">Subiendo...</span></>
                        ) : fotoEstado === "listo" ? (
                          <>
                            <span className="material-symbols-outlined text-status-aprobado-text" style={{ fontSize: "36px", fontVariationSettings: "'FILL' 1" }}>task</span>
                            <p className="font-body-bold text-body-bold text-status-aprobado-text">✓ Fotografía cargada</p>
                            <p className="font-label-sm text-label-sm text-on-surface-variant">Haz clic para reemplazar</p>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-status-observado-text" style={{ fontSize: "36px" }}>add_a_photo</span>
                            <p className="font-body-bold text-body-bold text-on-surface">Subir Fotografía Corregida</p>
                            <p className="font-label-sm text-label-sm text-on-surface-variant">JPG/PNG · Proporción 3:4</p>
                          </>
                        )}
                      </button>
                      {fotoEstado === "error" && <p className="text-error font-label-sm text-label-sm mt-sm">Error al subir. Intenta de nuevo.</p>}
                    </div>
                  )}

                  {/* Comprobante de Pago */}
                  {mostrarVoucher && (
                    <div className="border border-status-observado-text/30 rounded-lg p-md bg-status-observado-bg/30">
                      <div className="flex items-start gap-md mb-md">
                        <span className="material-symbols-outlined text-status-observado-text mt-xs">info</span>
                        <div className="flex-1">
                          <h4 className="font-body-bold text-body-bold text-on-surface mb-xs">Comprobante de Pago (JPG/PNG/PDF)</h4>
                          <p className="font-body-base text-body-base text-on-surface-variant">Cargue nuevamente el comprobante bancario claro y legible.</p>
                        </div>
                      </div>
                      <input type="file" ref={voucherRef} className="hidden" accept="image/jpeg,image/png,application/pdf"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) subirArchivo(f, "voucher"); }} />
                      <button type="button" onClick={() => voucherRef.current?.click()}
                        className={`w-full border-2 border-dashed rounded-xl p-lg flex flex-col items-center gap-sm transition-colors cursor-pointer ${
                          voucherEstado === "listo" ? "border-status-aprobado-text/40 bg-status-aprobado-bg/20"
                          : voucherEstado === "error" ? "border-error/40 bg-error-container/20"
                          : "border-status-observado-text bg-surface-container-lowest hover:bg-surface-bright"}`}>
                        {voucherEstado === "subiendo" ? (
                          <><Spinner /><span className="font-label-sm text-label-sm text-on-surface-variant mt-sm">Subiendo...</span></>
                        ) : voucherEstado === "listo" ? (
                          <>
                            <span className="material-symbols-outlined text-status-aprobado-text" style={{ fontSize: "36px", fontVariationSettings: "'FILL' 1" }}>task</span>
                            <p className="font-body-bold text-body-bold text-status-aprobado-text">✓ Comprobante cargado</p>
                            <p className="font-label-sm text-label-sm text-on-surface-variant">Haz clic para reemplazar</p>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-status-observado-text" style={{ fontSize: "36px" }}>upload_file</span>
                            <p className="font-body-bold text-body-bold text-on-surface">Subir Comprobante Corregido</p>
                            <p className="font-label-sm text-label-sm text-on-surface-variant">JPG, PNG o PDF · Máx. 5 MB</p>
                          </>
                        )}
                      </button>
                      {voucherEstado === "error" && <p className="text-error font-label-sm text-label-sm mt-sm">Error al subir. Intenta de nuevo.</p>}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Campos conformes — SOLO LECTURA */}
            <section className="w-full max-w-[672px] mx-auto">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
                <div className="bg-surface border-b border-outline-variant px-lg py-md">
                  <h3 className="font-body-bold text-body-bold text-on-surface flex items-center gap-sm">
                    <span className="material-symbols-outlined text-status-aprobado-text">check_circle</span>
                    Campos Conformes (No editar)
                  </h3>
                </div>
                <div className="p-lg grid grid-cols-1 md:grid-cols-2 gap-lg">
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">Correo Electrónico</label>
                    <input readOnly value={postulacion.gmail}
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-on-surface-variant font-body-base text-body-base cursor-not-allowed outline-none" />
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">✓ Conforme</p>
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">Carrera Asignada</label>
                    <input readOnly value={postulacion.carrera ? `Ing. ${postulacion.carrera.nombre}` : "Por asignar"}
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-on-surface-variant font-body-base text-body-base cursor-not-allowed outline-none" />
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">
                      {postulacion.carrera ? "✓ Asignado por Revisor" : "Pendiente de asignación"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Sin cobro adicional */}
            <section className="w-full max-w-[672px] mx-auto">
              <div className="bg-status-aprobado-bg border border-status-aprobado-text/20 rounded-xl p-md flex items-start gap-md">
                <span className="material-symbols-outlined text-status-aprobado-text mt-xs">check_circle</span>
                <div>
                  <h3 className="font-body-bold text-body-bold text-status-aprobado-text mb-xs">Sin Cobro Adicional</h3>
                  <p className="font-body-base text-body-base text-on-surface-variant">
                    Esta subsanación no genera cobros. Su cuota de inscripción (S/ 1,500.00) ya fue registrada.
                    Puede reenviar sin límite de intentos.
                  </p>
                </div>
              </div>
            </section>

            {/* Error de envío */}
            {errorEnvio && (
              <section className="w-full max-w-[672px] mx-auto">
                <div className="bg-error-container border border-error/20 text-error rounded-lg px-md py-sm flex items-center gap-sm font-body-base text-body-base">
                  <span className="material-symbols-outlined">error</span>
                  {errorEnvio}
                </div>
              </section>
            )}

            {/* Botones */}
            <section className="w-full max-w-[672px] mx-auto flex flex-col gap-md">
              <div className="flex flex-col sm:flex-row gap-md justify-end">
                <button type="button"
                  onClick={() => { setNuevaFotoUrl(null); setNuevoTituloUrl(null); setNuevoVoucherUrl(null); setFotoEstado("idle"); setTituloEstado("idle"); setVoucherEstado("idle"); setErrorEnvio(null); }}
                  className="w-full sm:w-auto h-[48px] px-lg rounded flex items-center justify-center gap-sm font-body-bold text-body-bold bg-surface-container-lowest text-on-surface hover:bg-surface-dim transition-colors border border-outline-variant">
                  <span className="material-symbols-outlined text-xl">refresh</span>
                  Limpiar Campos
                </button>
                <button type="button" onClick={reenviarExpediente}
                  disabled={enviando || (fotoEstado !== "listo" && tituloEstado !== "listo" && voucherEstado !== "listo")}
                  className="w-full sm:w-auto h-[48px] px-xl rounded flex items-center justify-center gap-sm font-body-bold text-body-bold bg-primary text-on-primary hover:brightness-110 transition-colors shadow-sm disabled:opacity-60">
                  {enviando ? <Spinner /> : <span className="material-symbols-outlined text-xl">send</span>}
                  Reenviar Expediente Corregido
                </button>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
                Al reenviar, el estado cambiará a &quot;Subsanado&quot; y el revisor lo evaluará nuevamente.
              </p>
            </section>
          </>
        )}
      </main>
    </>
  );
}
