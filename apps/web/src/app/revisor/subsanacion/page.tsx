"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Spinner } from "@/components/ui/Spinner";
import { subirImagen, subirPDF } from "@/lib/cloudinary";
import { buscarObservadoParaSubsanar, subsanarComoAdmin } from "@/lib/api";
import { CAMPO_LABEL } from "@/types";
import type { PostulacionDetalle, CampoObservable } from "@/types";
import {
  DocumentoUploader,
  ORDEN_CAMPOS,
  TODOS_LOS_CAMPOS,
  camposEditables,
  type EstadoArchivo,
} from "@/components/forms/DocumentoUploader";

const SIN_ARCHIVO: Record<CampoObservable, string | null> = { foto: null, titulo: null, voucher: null };
const SIN_ESTADO: Record<CampoObservable, EstadoArchivo> = { foto: "idle", titulo: "idle", voucher: "idle" };

/**
 * Módulo de subsanación presencial: el postulante llega a la sede con sus
 * documentos corregidos y el admin los carga por él. Solo puede reemplazar los
 * documentos que el revisor marcó como observados — la restricción la impone el
 * backend, esta pantalla únicamente evita ofrecer lo que no corresponde.
 */
export default function SubsanacionAdminPage() {
  const [dni, setDni] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [postulacion, setPostulacion] = useState<PostulacionDetalle | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  const [urls, setUrls] = useState(SIN_ARCHIVO);
  const [estados, setEstados] = useState(SIN_ESTADO);

  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [exito, setExito] = useState<number | null>(null);

  const editables = postulacion ? camposEditables(postulacion) : [];
  const conformes = TODOS_LOS_CAMPOS.filter((c) => !editables.includes(c));
  const hayAlgoCargado = editables.some((c) => estados[c] === "listo");

  function limpiarDocumentos() {
    setUrls(SIN_ARCHIVO);
    setEstados(SIN_ESTADO);
    setErrorEnvio(null);
  }

  async function buscar() {
    const q = dni.trim();
    if (!/^\d{8}$/.test(q)) {
      setErrorBusqueda("Ingresa un DNI de 8 dígitos.");
      return;
    }
    setBuscando(true);
    setErrorBusqueda(null);
    setPostulacion(null);
    setExito(null);
    limpiarDocumentos();
    try {
      setPostulacion(await buscarObservadoParaSubsanar(q));
    } catch (err) {
      // El backend distingue 404 (no existe), 403 (otra sede) y 409 (no
      // observado); su mensaje ya explica el caso, así que se muestra tal cual.
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      setErrorBusqueda(msg ?? "No se pudo consultar el expediente. Revisa la conexión.");
    } finally {
      setBuscando(false);
    }
  }

  async function subirArchivo(file: File, campo: CampoObservable) {
    setEstados((e) => ({ ...e, [campo]: "subiendo" }));
    try {
      const url = file.type === "application/pdf" ? await subirPDF(file) : await subirImagen(file);
      setUrls((u) => ({ ...u, [campo]: url }));
      setEstados((e) => ({ ...e, [campo]: "listo" }));
    } catch {
      setEstados((e) => ({ ...e, [campo]: "error" }));
    }
  }

  async function registrar() {
    if (!postulacion) return;
    // Solo viaja lo observado, aunque quedara otra URL en estado.
    const payload = {
      ...(editables.includes("foto") && urls.foto ? { fotoUrl: urls.foto } : {}),
      ...(editables.includes("titulo") && urls.titulo ? { tituloUrl: urls.titulo } : {}),
      ...(editables.includes("voucher") && urls.voucher ? { voucherUrl: urls.voucher } : {}),
    };
    if (Object.keys(payload).length === 0) {
      setErrorEnvio("Carga al menos un documento antes de registrar la subsanación.");
      return;
    }
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const r = await subsanarComoAdmin(postulacion.id, payload);
      setExito(r.id);
      setPostulacion(null);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      setErrorEnvio(msg ?? "No se pudo registrar la subsanación. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function reiniciar() {
    setDni("");
    setPostulacion(null);
    setExito(null);
    setErrorBusqueda(null);
    limpiarDocumentos();
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <header className="bg-surface-container-lowest border-b border-outline-variant px-lg py-md shrink-0">
        <h2 className="text-[20px] font-semibold text-on-surface">Subsanación Presencial</h2>
        <p className="text-[13px] text-on-surface-variant">
          Carga los documentos corregidos de un postulante que se acerca a la sede.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-lg">
        <div className="max-w-container-admin mx-auto flex flex-col gap-lg">

          {/* Éxito */}
          {exito !== null && (
            <div className="bg-status-aprobado-bg border border-status-aprobado-text/20 rounded-xl p-lg flex items-start gap-md">
              <span
                className="material-symbols-outlined text-status-aprobado-text shrink-0"
                style={{ fontSize: "40px", fontVariationSettings: "'FILL' 1" }}
              >
                task_alt
              </span>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-status-aprobado-text">
                  Subsanación registrada
                </h3>
                <p className="text-[14px] text-on-surface-variant mt-xs">
                  El expediente <strong className="text-on-surface">#{exito}</strong> quedó como
                  SUBSANADO y volvió a la bandeja para su revisión.
                </p>
                <div className="flex flex-col sm:flex-row gap-sm mt-md">
                  <button
                    onClick={reiniciar}
                    className="px-lg py-2.5 rounded-lg text-[15px] font-semibold bg-primary text-on-primary hover:brightness-110 transition-all"
                  >
                    Subsanar otro DNI
                  </button>
                  <Link
                    href="/revisor"
                    className="px-lg py-2.5 rounded-lg text-[15px] font-semibold border border-outline-variant text-on-surface hover:bg-surface-container transition-colors text-center"
                  >
                    Ir a la bandeja
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Buscador */}
          {exito === null && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
              <h3 className="text-[15px] font-semibold text-on-surface mb-md">
                Buscar expediente observado
              </h3>
              <div className="flex gap-sm">
                <div className="relative flex-grow">
                  <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant">
                    badge
                  </span>
                  <input
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    onKeyDown={(e) => e.key === "Enter" && buscar()}
                    placeholder="DNI del postulante (8 dígitos)"
                    maxLength={8}
                    className="w-full pl-xl pr-sm py-2 bg-surface-container-low border border-outline-variant rounded-lg text-[15px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                  />
                </div>
                <button
                  type="button"
                  onClick={buscar}
                  disabled={buscando || dni.length !== 8}
                  className="flex items-center gap-xs bg-primary text-on-primary text-[15px] font-semibold px-lg py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {buscando ? <Spinner /> : <span className="material-symbols-outlined text-xl">search</span>}
                  Buscar
                </button>
              </div>

              {errorBusqueda && (
                <div className="mt-md bg-error-container border border-error/20 text-error rounded-lg px-md py-sm flex items-start gap-sm text-[14px]">
                  <span className="material-symbols-outlined shrink-0">search_off</span>
                  {errorBusqueda}
                </div>
              )}
            </div>
          )}

          {/* Expediente encontrado */}
          {postulacion && (
            <>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-md">
                <div>
                  <p className="text-[13px] text-on-surface-variant mb-xs">
                    Expediente #CIP-{postulacion.creadoEn.slice(0, 4)}-
                    {String(postulacion.id).padStart(4, "0")}
                  </p>
                  <p className="text-[15px] font-semibold text-on-surface uppercase">
                    {postulacion.apellidoPaterno} {postulacion.apellidoMaterno},{" "}
                    {postulacion.nombres}
                  </p>
                  <p className="text-[13px] text-on-surface-variant mt-xs">
                    DNI {postulacion.dni} · {postulacion.region.nombre}
                  </p>
                </div>
                <div className="flex items-center gap-md shrink-0">
                  <span className="px-md py-sm bg-status-observado-bg text-status-observado-text rounded-full text-[13px] font-bold">
                    Observado
                  </span>
                  <button
                    onClick={() => { setPostulacion(null); setDni(""); limpiarDocumentos(); }}
                    className="text-[13px] text-primary hover:underline"
                  >
                    Cambiar DNI
                  </button>
                </div>
              </div>

              {/* Observaciones del revisor */}
              {postulacion.observaciones.length > 0 && (
                <div className="bg-status-observado-bg border border-status-observado-text/20 rounded-xl p-md">
                  <h4 className="text-[13px] font-semibold text-status-observado-text mb-sm flex items-center gap-xs">
                    <span className="material-symbols-outlined text-base">info</span>
                    Observaciones del revisor
                  </h4>
                  <ul className="space-y-xs">
                    {postulacion.observaciones.slice(0, 3).map((obs) => (
                      <li key={obs.id} className="text-[13px] text-on-surface-variant">
                        • {obs.mensaje}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Documentos observados */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
                <div className="bg-surface border-b border-outline-variant px-lg py-md">
                  <h3 className="text-[15px] font-semibold text-on-surface flex items-center gap-sm">
                    <span className="material-symbols-outlined text-status-observado-text">
                      assignment_late
                    </span>
                    Documentos a reemplazar
                  </h3>
                  <p className="text-[13px] text-on-surface-variant mt-xs">
                    Solo{" "}
                    <strong className="text-status-observado-text">
                      {editables.map((c) => CAMPO_LABEL[c].toLowerCase()).join(" y ")}
                    </strong>
                    {conformes.length > 0 && (
                      <>
                        {" "}— el resto ({conformes.map((c) => CAMPO_LABEL[c].toLowerCase()).join(", ")})
                        está conforme y no se modifica
                      </>
                    )}
                    .
                  </p>
                </div>
                <div className="p-lg flex flex-col gap-lg">
                  {ORDEN_CAMPOS.filter((c) => editables.includes(c)).map((campo) => (
                    <DocumentoUploader
                      key={campo}
                      campo={campo}
                      estado={estados[campo]}
                      tienePrevio={Boolean(
                        campo === "foto"
                          ? postulacion.fotoUrl
                          : campo === "titulo"
                          ? postulacion.tituloUrl
                          : postulacion.voucherUrl
                      )}
                      onArchivo={(f) => subirArchivo(f, campo)}
                    />
                  ))}
                </div>
              </div>

              {/* La carga queda a nombre del admin: conviene que lo sepa */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-md flex items-start gap-sm text-[13px] text-on-surface-variant">
                <span className="material-symbols-outlined text-primary shrink-0">shield_person</span>
                <span>
                  Los documentos se registran a nombre del postulante, pero la operación queda
                  asociada a tu usuario en la auditoría del expediente.
                </span>
              </div>

              {errorEnvio && (
                <div className="bg-error-container border border-error/20 text-error rounded-lg px-md py-sm flex items-start gap-sm text-[14px]">
                  <span className="material-symbols-outlined shrink-0">error</span>
                  {errorEnvio}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={registrar}
                  disabled={enviando || !hayAlgoCargado}
                  className="flex items-center justify-center gap-sm bg-primary text-on-primary text-[15px] font-semibold px-xl py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enviando ? <Spinner /> : <span className="material-symbols-outlined text-xl">send</span>}
                  Registrar Subsanación
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
