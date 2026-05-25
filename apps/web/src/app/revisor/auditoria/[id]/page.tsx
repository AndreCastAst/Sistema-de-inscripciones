"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import {
  getPostulacionDetalle,
  aprobarPostulacion,
  observarPostulacion,
  getCarreras,
} from "@/lib/api";
import type { PostulacionDetalle, Carrera } from "@/types";

interface Props {
  params: { id: string };
}

export default function AuditoriaPage({ params }: Props) {
  const id = Number(params.id);

  const [postulacion, setPostulacion] = useState<PostulacionDetalle | null>(null);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Panel de decisión
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>("");
  const [observacion, setObservacion] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [mensajeAccion, setMensajeAccion] = useState<{
    tipo: "exito" | "error";
    texto: string;
  } | null>(null);

  // Estado de validación de documentos
  const [estadoFoto, setEstadoFoto] = useState<"sin-validar" | "correcto" | "observado">(
    "sin-validar"
  );
  const [estadoTitulo, setEstadoTitulo] = useState<"sin-validar" | "correcto" | "observado">(
    "sin-validar"
  );
  const [estadoVoucher, setEstadoVoucher] = useState<"sin-validar" | "correcto" | "observado">(
    "sin-validar"
  );

  useEffect(() => {
    Promise.all([
      getPostulacionDetalle(id),
      getCarreras(),
    ])
      .then(([p, c]) => {
        setPostulacion(p);
        setCarreras(c);
        setCarreraSeleccionada(p.carreraId ? String(p.carreraId) : "");
      })
      .catch(() => {
        setError("No se pudo cargar el expediente. Verifica la conexión con el servidor.");
      })
      .finally(() => setCargando(false));
  }, [id]);

  async function handleAprobar() {
    if (!carreraSeleccionada) {
      setMensajeAccion({ tipo: "error", texto: "Selecciona una especialidad antes de aprobar." });
      return;
    }
    setProcesando(true);
    setMensajeAccion(null);
    try {
      const result = await aprobarPostulacion(id, Number(carreraSeleccionada));
      setMensajeAccion({
        tipo: "exito",
        texto: `Expediente aprobado. Código CIP generado: ${result.codigoCIP}`,
      });
      setPostulacion((p) => (p ? { ...p, estado: "APROBADO" } : p));
    } catch {
      setMensajeAccion({ tipo: "error", texto: "Error al aprobar el expediente. Intenta de nuevo." });
    } finally {
      setProcesando(false);
    }
  }

  async function handleObservar() {
    if (!observacion.trim() || observacion.trim().length < 10) {
      setMensajeAccion({ tipo: "error", texto: "La observación debe tener al menos 10 caracteres." });
      return;
    }
    const camposObservados = [
      estadoFoto === "observado" && "foto",
      estadoTitulo === "observado" && "titulo",
      estadoVoucher === "observado" && "voucher",
    ].filter(Boolean) as string[];

    if (camposObservados.length === 0) {
      setMensajeAccion({ tipo: "error", texto: "Debes marcar al menos un documento como observado (⚠ Obs.)." });
      return;
    }
    setProcesando(true);
    setMensajeAccion(null);
    try {
      await observarPostulacion(id, observacion, 1, camposObservados);
      setMensajeAccion({
        tipo: "exito",
        texto: "Observación enviada. El postulante recibirá un enlace por correo para subsanar.",
      });
      setPostulacion((p) => (p ? { ...p, estado: "OBSERVADO" } : p));
    } catch {
      setMensajeAccion({ tipo: "error", texto: "Error al enviar la observación. Intenta de nuevo." });
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center gap-md text-on-surface-variant text-[15px]">
        <Spinner />
        Cargando expediente...
      </div>
    );
  }

  if (!postulacion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-md p-xl text-center">
        <span className="material-symbols-outlined text-outline" style={{ fontSize: "56px" }}>
          search_off
        </span>
        <h2 className="text-[20px] font-semibold text-on-surface">Expediente no encontrado</h2>
        <Link href="/revisor" className="text-primary hover:underline text-[15px]">
          ← Volver a la bandeja
        </Link>
      </div>
    );
  }

  const yaDecidido = postulacion.estado === "APROBADO" || postulacion.estado === "RECHAZADO";
  const nombreCompleto = `${postulacion.apellidoPaterno} ${postulacion.apellidoMaterno}, ${postulacion.nombres}`;

  const estadoBadge: Record<string, { bg: string; text: string; label: string }> = {
    PENDIENTE: { bg: "bg-status-pendiente-bg", text: "text-status-pendiente-text", label: "En Revisión" },
    OBSERVADO: { bg: "bg-status-observado-bg", text: "text-status-observado-text", label: "Observado" },
    SUBSANADO: { bg: "bg-[#DBEAFE]", text: "text-[#1E40AF]", label: "Subsanado" },
    APROBADO: { bg: "bg-status-aprobado-bg", text: "text-status-aprobado-text", label: "Aprobado" },
    RECHAZADO: { bg: "bg-status-rechazado-bg", text: "text-status-rechazado-text", label: "Rechazado" },
  };

  const badge = estadoBadge[postulacion.estado] ?? estadoBadge.PENDIENTE;

  function iconoValidacion(estado: "sin-validar" | "correcto" | "observado") {
    if (estado === "correcto")
      return "text-status-aprobado-text";
    if (estado === "observado")
      return "text-status-observado-text";
    return "text-on-surface-variant";
  }

  // Cloudinary bloquea entrega de PDFs; convierte a JPEG para visualizar
  function obtenerUrlVisor(url: string): string | null {
    if (!url) return null;
    if (url.includes("/image/upload/")) {
      return url.replace(/\.pdf(\?.*)?$/, ".jpg");
    }
    return null; // raw/upload PDFs no se pueden mostrar
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Cabecera */}
      <header className="bg-surface border-b border-outline-variant px-lg py-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-md">
          <Link
            href="/revisor"
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Auditoría de Expediente
            </h2>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Exp. #{id} • {postulacion.region.nombre} •{" "}
              {new Date(postulacion.creadoEn).toLocaleDateString("es-PE")}
            </p>
          </div>
        </div>
        <span className={`px-sm py-xs rounded-full font-label-sm text-label-sm border ${badge.bg} ${badge.text} border-current/20`}>
          {badge.label}
        </span>
      </header>

      {/* Error de backend */}
      {error && (
        <div className="mx-lg mt-md bg-status-observado-bg border border-status-observado-text/20 text-status-observado-text rounded-lg px-md py-sm flex items-center gap-sm text-[13px]">
          <span className="material-symbols-outlined text-lg">info</span>
          {error}
        </div>
      )}

      {/* Vista dividida */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-lg gap-lg max-w-container-admin mx-auto w-full">
        {/* Panel izquierdo: Identidad + Documentos */}
        <section className="flex-1 flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          {/* Identidad */}
          <div className="p-md border-b border-outline-variant bg-surface flex items-start gap-md shrink-0">
            {/* Foto con controles de validación */}
            <div className="relative shrink-0">
              <div className="w-[80px] h-[100px] bg-surface-container-high rounded overflow-hidden border border-outline-variant">
                {postulacion.fotoUrl ? (
                  <img
                    src={postulacion.fotoUrl}
                    alt={nombreCompleto}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-outline text-4xl">person</span>
                  </div>
                )}
              </div>
              {/* Botones de validación de foto */}
              <div className="absolute top-0 right-0 flex gap-0.5 bg-surface/80 rounded-bl-lg border-l border-b border-outline-variant p-0.5">
                <button
                  onClick={() => setEstadoFoto("correcto")}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-all hover:scale-110 ${
                    estadoFoto === "correcto"
                      ? "bg-status-aprobado-bg text-status-aprobado-text"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                  title="Foto correcta"
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </button>
                <button
                  onClick={() => setEstadoFoto("observado")}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-all hover:scale-110 ${
                    estadoFoto === "observado"
                      ? "bg-status-observado-bg text-status-observado-text"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                  title="Observar foto"
                >
                  <span className="material-symbols-outlined text-base">warning</span>
                </button>
              </div>
            </div>

            {/* Datos del postulante */}
            <div className="flex-1">
              <h3 className="font-body-bold text-body-bold text-on-surface uppercase mb-sm">
                {nombreCompleto}
              </h3>
              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">DNI</p>
                  <p className="font-body-base text-body-base text-on-surface flex items-center gap-xs">
                    {postulacion.dni}
                    <span className="material-symbols-outlined text-status-aprobado-text text-base">
                      check_circle
                    </span>
                  </p>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Correo</p>
                  <p className="font-label-sm text-label-sm text-on-surface truncate">{postulacion.gmail}</p>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Carrera</p>
                  <p className="font-body-base text-body-base text-on-surface">
                    {postulacion.carrera ? `Ing. ${postulacion.carrera.nombre}` : "Por asignar"}
                  </p>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Región</p>
                  <p className="font-body-base text-body-base text-on-surface">{postulacion.region.nombre}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs de documentos */}
            <div className="flex border-b border-outline-variant bg-surface shrink-0">
              {[
                {
                  key: "titulo",
                  label: "Título Profesional",
                  url: postulacion.tituloUrl,
                  estado: estadoTitulo,
                  setEstado: setEstadoTitulo,
                },
                {
                  key: "voucher",
                  label: "Comprobante de Pago",
                  url: postulacion.voucherUrl,
                  estado: estadoVoucher,
                  setEstado: setEstadoVoucher,
                },
              ].map(({ key, label, url, estado, setEstado }) => (
                <div key={key} className="flex-1 flex flex-col">
                  {/* Toolbar del documento */}
                  <div className="h-10 bg-surface-container-highest border-b border-outline-variant flex items-center justify-between px-md shrink-0">
                    <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                      {label}
                    </span>
                    <div className="flex items-center gap-sm">
                      {obtenerUrlVisor(url ?? "") && (
                        <a
                          href={obtenerUrlVisor(url ?? "") ?? ""}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-xs text-[12px] text-primary hover:underline"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          Abrir
                        </a>
                      )}
                      <div className="flex gap-0.5 bg-surface-container-low p-0.5 rounded-lg border border-outline-variant">
                        <button
                          onClick={() => setEstado("correcto")}
                          className={`flex items-center gap-1 px-sm py-0.5 rounded text-[13px] font-medium transition-colors ${
                            estado === "correcto"
                              ? "bg-status-aprobado-bg text-status-aprobado-text"
                              : "hover:bg-status-aprobado-bg/50 text-on-surface-variant"
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          OK
                        </button>
                        <button
                          onClick={() => setEstado("observado")}
                          className={`flex items-center gap-1 px-sm py-0.5 rounded text-[13px] font-medium transition-colors ${
                            estado === "observado"
                              ? "bg-status-observado-bg text-status-observado-text"
                              : "hover:bg-status-observado-bg/50 text-on-surface-variant"
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">warning</span>
                          Obs.
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Visor del documento */}
                  <div className="relative bg-surface-container-low h-[420px] flex items-center justify-center overflow-hidden">
                    {url ? (() => {
                      const viewUrl = obtenerUrlVisor(url);
                      return viewUrl ? (
                        <img
                          src={viewUrl}
                          alt={label}
                          className="max-w-full max-h-full object-contain rounded border border-outline-variant"
                          style={{ maxHeight: "400px" }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-sm text-center px-lg">
                          <span
                            className="material-symbols-outlined text-on-surface-variant/40"
                            style={{ fontSize: "56px" }}
                          >
                            sync_problem
                          </span>
                          <p className="text-[14px] font-medium text-on-surface">Vista previa no disponible</p>
                          <p className="text-[12px] text-on-surface-variant max-w-[220px]">
                            El documento fue cargado en un formato anterior. El postulante debe re-enviar la solicitud.
                          </p>
                        </div>
                      );
                    })() : (
                      <div className="flex flex-col items-center justify-center text-on-surface-variant gap-sm">
                        <span
                          className="material-symbols-outlined text-outline"
                          style={{ fontSize: "48px" }}
                        >
                          description
                        </span>
                        <p className="text-[13px]">Documento no adjuntado</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historial de observaciones */}
          {postulacion.observaciones.length > 0 && (
            <div className="border-t border-outline-variant p-md bg-surface shrink-0 max-h-[150px] overflow-y-auto">
              <p className="font-label-sm text-label-sm font-semibold text-on-surface mb-sm">
                Historial de observaciones:
              </p>
              {postulacion.observaciones.map((obs) => (
                <div
                  key={obs.id}
                  className="font-label-sm text-label-sm text-on-surface-variant border-l-2 border-status-observado-text pl-sm mb-sm"
                >
                  {obs.mensaje}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Panel derecho: Decisión */}
        <aside className="w-full lg:w-[360px] shrink-0 flex flex-col gap-lg overflow-y-auto pb-lg">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-sm">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Panel de Decisión</h3>

            {/* Resumen de validación */}
            <div className="mb-md p-sm bg-surface-container-low rounded-lg border border-outline-variant">
              <p className="font-label-sm text-label-sm font-medium text-on-surface mb-sm">Estado de documentos:</p>
              {[
                { label: "Fotografía", estado: estadoFoto },
                { label: "Título Profesional", estado: estadoTitulo },
                { label: "Comprobante de Pago", estado: estadoVoucher },
              ].map(({ label, estado }) => (
                <div key={label} className="flex items-center justify-between py-xs">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
                  <span
                    className={`font-label-sm text-label-sm ${iconoValidacion(estado)}`}
                  >
                    {estado === "correcto" ? "✓ Correcto" : estado === "observado" ? "⚠ Observado" : "— Sin validar"}
                  </span>
                </div>
              ))}
            </div>

            {/* Asignar especialidad */}
            <div className="mb-md">
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Asignar Capítulo / Especialidad CIP{" "}
                <span className="text-error">*</span>
              </label>
              <select
                value={carreraSeleccionada}
                onChange={(e) => setCarreraSeleccionada(e.target.value)}
                disabled={yaDecidido}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg px-md py-sm font-body-base text-body-base text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors disabled:opacity-60"
              >
                <option value="">Seleccione del catálogo CIP...</option>
                {carreras.map((c) => (
                  <option key={c.id} value={c.id}>
                    Ing. {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Observaciones */}
            <div className="mb-md p-sm rounded-lg bg-status-observado-bg/30 border border-status-observado-text/20">
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Observaciones{" "}
                <span className="text-on-surface-variant/70">
                  (Obligatorio para observar)
                </span>
                <span className="text-error"> *</span>
              </label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                disabled={yaDecidido}
                placeholder="Describa detalladamente las observaciones encontradas en los documentos..."
                rows={4}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg px-md py-sm font-body-base text-body-base text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none placeholder:text-on-surface-variant/50 disabled:opacity-60"
              />
            </div>

            {/* Mensaje de resultado */}
            {mensajeAccion && (
              <div
                className={`p-sm rounded-lg text-[13px] font-medium mb-md flex items-start gap-sm ${
                  mensajeAccion.tipo === "exito"
                    ? "bg-status-aprobado-bg text-status-aprobado-text"
                    : "bg-error-container text-error"
                }`}
              >
                <span className="material-symbols-outlined text-lg shrink-0">
                  {mensajeAccion.tipo === "exito" ? "check_circle" : "error"}
                </span>
                {mensajeAccion.texto}
              </div>
            )}

            {/* Botones de acción */}
            {!yaDecidido ? (
              <div className="flex flex-col gap-sm pt-md border-t border-outline-variant">
                <button
                  onClick={handleObservar}
                  disabled={procesando}
                  className="w-full bg-primary text-on-primary font-body-bold text-body-bold h-12 rounded-lg flex items-center justify-center gap-sm hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {procesando && <Spinner />}
                  <span className="material-symbols-outlined text-xl">send</span>
                  Enviar Notificación de Observación
                </button>
                <button
                  onClick={handleAprobar}
                  disabled={procesando || !carreraSeleccionada}
                  className="w-full bg-status-aprobado-bg border border-status-aprobado-text/30 text-status-aprobado-text font-body-bold text-body-bold h-12 rounded-lg flex items-center justify-center gap-sm hover:bg-status-aprobado-bg/80 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {procesando && <Spinner />}
                  <span className="material-symbols-outlined text-xl">check_circle</span>
                  Aprobar y Generar Código CIP
                </button>
              </div>
            ) : (
              <div className="pt-md border-t border-outline-variant">
                <div
                  className={`p-sm rounded-lg text-[13px] font-semibold text-center ${
                    postulacion.estado === "APROBADO"
                      ? "bg-status-aprobado-bg text-status-aprobado-text"
                      : "bg-status-rechazado-bg text-status-rechazado-text"
                  }`}
                >
                  Expediente {postulacion.estado === "APROBADO" ? "aprobado" : "rechazado"}.
                  No se puede modificar.
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
