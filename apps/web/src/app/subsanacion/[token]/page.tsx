"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { NavBar } from "@/components/ui/NavBar";
import { Spinner } from "@/components/ui/Spinner";
import { subirImagen, subirPDF } from "@/lib/cloudinary";
import { getSubsanacionPorToken, subsanarPorToken } from "@/lib/api";
import { CAMPO_LABEL } from "@/types";
import type { PostulacionDetalle, CampoObservable } from "@/types";
import {
  DocumentoUploader,
  ORDEN_CAMPOS,
  camposEditables,
  type EstadoArchivo,
} from "@/components/forms/DocumentoUploader";

interface Props {
  params: { token: string };
}

/**
 * Pantalla de subsanación abierta desde el enlace del correo. A diferencia de
 * /subsanacion, no pide DNI: el token del enlace ya identifica el expediente.
 */
export default function SubsanacionPorTokenPage({ params }: Props) {
  const { token } = params;

  const [postulacion, setPostulacion] = useState<PostulacionDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [urls, setUrls] = useState<Record<CampoObservable, string | null>>({
    foto: null,
    titulo: null,
    voucher: null,
  });
  const [estados, setEstados] = useState<Record<CampoObservable, EstadoArchivo>>({
    foto: "idle",
    titulo: "idle",
    voucher: "idle",
  });

  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useEffect(() => {
    getSubsanacionPorToken(token)
      .then(setPostulacion)
      .catch((err) => {
        const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
        setErrorCarga(msg ?? "No pudimos abrir tu expediente. Verifica el enlace del correo.");
      })
      .finally(() => setCargando(false));
  }, [token]);

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

  const editables = postulacion ? camposEditables(postulacion) : [];
  const hayAlgoCargado = editables.some((c) => estados[c] === "listo");

  async function reenviar() {
    if (!postulacion) return;
    // Solo viaja lo que el revisor habilitó, aunque quedara otra URL en estado.
    const payload = {
      ...(editables.includes("foto") && urls.foto ? { fotoUrl: urls.foto } : {}),
      ...(editables.includes("titulo") && urls.titulo ? { tituloUrl: urls.titulo } : {}),
      ...(editables.includes("voucher") && urls.voucher ? { voucherUrl: urls.voucher } : {}),
    };
    if (Object.keys(payload).length === 0) {
      setErrorEnvio("Debes corregir al menos un documento antes de reenviar.");
      return;
    }
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await subsanarPorToken(token, payload);
      setExito(true);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      setErrorEnvio(msg ?? "Error al reenviar el expediente. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <>
        <NavBar activeTab="portal" />
        <main className="flex-grow flex items-center justify-center gap-md text-on-surface-variant">
          <Spinner />
          Abriendo tu expediente...
        </main>
      </>
    );
  }

  if (errorCarga || !postulacion) {
    return (
      <>
        <NavBar activeTab="portal" />
        <main className="flex-grow w-full max-w-[560px] mx-auto px-md py-xl flex flex-col items-center justify-center gap-md text-center">
          <span className="material-symbols-outlined text-outline" style={{ fontSize: "64px" }}>
            link_off
          </span>
          <h1 className="text-[24px] font-bold text-on-surface">Enlace no válido</h1>
          <p className="text-[15px] text-on-surface-variant">{errorCarga}</p>
          <p className="text-[13px] text-on-surface-variant/80">
            Cada enlace sirve una sola vez. Si ya reenviaste tus documentos, no necesitas hacer
            nada más: el revisor los está evaluando.
          </p>
          <Link
            href="/"
            className="mt-sm bg-primary text-on-primary px-xl py-sm rounded-lg text-[15px] font-semibold hover:brightness-110 transition-all"
          >
            Ir al inicio
          </Link>
        </main>
      </>
    );
  }

  if (exito) {
    return (
      <>
        <NavBar activeTab="portal" />
        <main className="flex-grow w-full max-w-[560px] mx-auto px-md py-xl flex flex-col items-center justify-center gap-md text-center">
          <span
            className="material-symbols-outlined text-status-aprobado-text"
            style={{ fontSize: "72px", fontVariationSettings: "'FILL' 1" }}
          >
            task_alt
          </span>
          <h1 className="text-[28px] font-bold text-on-surface">¡Expediente reenviado!</h1>
          <p className="text-[15px] text-on-surface-variant">
            Tus documentos corregidos fueron recibidos. El revisor los evaluará y te notificaremos
            por correo cuando haya novedades.
          </p>
          <Link
            href="/"
            className="mt-sm bg-primary text-on-primary px-xl py-sm rounded-lg text-[15px] font-semibold hover:brightness-110 transition-all"
          >
            Volver al inicio
          </Link>
        </main>
      </>
    );
  }

  const nombre = `${postulacion.nombres} ${postulacion.apellidoPaterno} ${postulacion.apellidoMaterno}`;

  return (
    <>
      <NavBar activeTab="portal" />
      <main className="flex-grow w-full max-w-[672px] mx-auto px-md md:px-lg py-xl flex flex-col gap-lg">
        {/* Cabecera con identidad ya resuelta por el enlace */}
        <div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant">
          <h1 className="text-[20px] font-semibold text-on-surface flex items-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-status-observado-text">warning</span>
            Subsanación de tu expediente
          </h1>
          <p className="text-[15px] text-on-surface-variant mb-md">
            Hola <strong className="text-on-surface">{nombre}</strong>, tu expediente{" "}
            <strong className="text-on-surface">
              #CIP-{postulacion.creadoEn.slice(0, 4)}-{String(postulacion.id).padStart(4, "0")}
            </strong>{" "}
            tiene observaciones. Corrige solo lo señalado y reenvíalo, sin costo adicional.
          </p>
          <div className="bg-status-observado-bg border border-status-observado-text/20 rounded-lg p-md">
            <h2 className="text-[13px] font-semibold text-status-observado-text mb-sm flex items-center gap-xs">
              <span className="material-symbols-outlined text-base">info</span>
              Observaciones del revisor
            </h2>
            <ul className="space-y-xs">
              {postulacion.observaciones.slice(0, 3).map((obs) => (
                <li key={obs.id} className="text-[13px] text-on-surface-variant">
                  • {obs.mensaje}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Solo los documentos observados */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
          <div className="bg-surface border-b border-outline-variant px-lg py-md">
            <h2 className="text-[20px] font-semibold text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-status-observado-text">assignment_late</span>
              Documentos a corregir
            </h2>
            <p className="text-[13px] text-on-surface-variant mt-xs">
              Solo puedes reemplazar{" "}
              <strong className="text-status-observado-text">
                {editables.map((c) => CAMPO_LABEL[c].toLowerCase()).join(" y ")}
              </strong>
              . El resto de tu expediente se mantiene como lo enviaste.
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

        {errorEnvio && (
          <div className="bg-error-container border border-error/20 text-error rounded-lg px-md py-sm flex items-center gap-sm text-[15px]">
            <span className="material-symbols-outlined">error</span>
            {errorEnvio}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={reenviar}
            disabled={enviando || !hayAlgoCargado}
            className="w-full sm:w-auto h-[48px] px-xl rounded-lg flex items-center justify-center gap-sm text-[15px] font-semibold bg-primary text-on-primary hover:brightness-110 transition-colors shadow-sm disabled:opacity-60"
          >
            {enviando ? <Spinner /> : <span className="material-symbols-outlined text-xl">send</span>}
            Reenviar Expediente Corregido
          </button>
        </div>
      </main>
    </>
  );
}
