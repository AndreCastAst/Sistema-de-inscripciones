"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import {
  getPostulacionDetalle,
  aprobarPostulacion,
  observarPostulacion,
  redirigirPostulacion,
  getCarreras,
  getRegiones,
} from "@/lib/api";
import { isSuperAdmin } from "@/lib/auth";
import { CAMPO_LABEL } from "@/types";
import type { PostulacionDetalle, Carrera, Region, CampoObservable } from "@/types";

interface Props {
  params: { id: string };
}

export default function AuditoriaPage({ params }: Props) {
  const id = Number(params.id);
  const router = useRouter();

  const [postulacion, setPostulacion] = useState<PostulacionDetalle | null>(null);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirección de sede (el postulante se equivocó al inscribirse)
  const [redirigirAbierto, setRedirigirAbierto] = useState(false);
  const [sedeDestino, setSedeDestino] = useState<string>("");
  const [motivoRedireccion, setMotivoRedireccion] = useState("");
  const [redirigiendo, setRedirigiendo] = useState(false);

  // Panel de decisión
  const [especialidad, setEspecialidad] = useState<string>("");
  const [fechaAlta, setFechaAlta] = useState<string>("");
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

  // Documentos marcados como "Obs.": son los únicos que el postulante podrá
  // reemplazar al subsanar, así que se envían junto con la observación.
  const camposObservados: CampoObservable[] = [
    ...(estadoFoto === "observado" ? (["foto"] as const) : []),
    ...(estadoTitulo === "observado" ? (["titulo"] as const) : []),
    ...(estadoVoucher === "observado" ? (["voucher"] as const) : []),
  ];

  useEffect(() => {
    Promise.all([
      getPostulacionDetalle(id),
      getCarreras(),
      getRegiones(),
    ])
      .then(([p, c, r]) => {
        setPostulacion(p);
        setCarreras(c);
        setRegiones(r);
        setEspecialidad(p.carrera ? `Ing. ${p.carrera.nombre}` : "");
      })
      .catch(() => {
        setError("No se pudo cargar el expediente. Verifica la conexión con el servidor.");
      })
      .finally(() => setCargando(false));
  }, [id]);

  async function handleAprobar() {
    if (!especialidad.trim()) {
      setMensajeAccion({ tipo: "error", texto: "Indica una especialidad antes de aprobar." });
      return;
    }
    setProcesando(true);
    setMensajeAccion(null);
    try {
      const result = await aprobarPostulacion(
        id,
        especialidad.trim(),
        fechaAlta || undefined
      );
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
      setMensajeAccion({
        tipo: "error",
        texto: "La observación debe tener al menos 10 caracteres.",
      });
      return;
    }
    // Los documentos marcados con "Obs." definen qué podrá reemplazar el
    // postulante al subsanar; sin ninguno no tendría nada que corregir.
    if (camposObservados.length === 0) {
      setMensajeAccion({
        tipo: "error",
        texto: 'Marca con "Obs." al menos un documento antes de enviar la observación.',
      });
      return;
    }
    setProcesando(true);
    setMensajeAccion(null);
    try {
      await observarPostulacion(id, observacion, 1, camposObservados);
      setMensajeAccion({
        tipo: "exito",
        texto: `Observación enviada. El postulante solo podrá corregir: ${camposObservados
          .map((c) => CAMPO_LABEL[c].toLowerCase())
          .join(", ")}.`,
      });
      setPostulacion((p) => (p ? { ...p, estado: "OBSERVADO" } : p));
    } catch {
      setMensajeAccion({
        tipo: "error",
        texto: "Error al enviar la observación. Intenta de nuevo.",
      });
    } finally {
      setProcesando(false);
    }
  }

  async function handleRedirigir() {
    const regionId = Number(sedeDestino);
    if (!regionId) {
      setMensajeAccion({ tipo: "error", texto: "Selecciona la sede de destino." });
      return;
    }
    const destino = regiones.find((r) => r.id === regionId);

    // Un admin de sede pierde el acceso al expediente en cuanto sale de su región.
    const perderaAcceso = !isSuperAdmin();
    const aviso = perderaAcceso
      ? `\n\nAl pertenecer a otra sede, este expediente dejará de ser visible para ti.`
      : "";
    if (
      !window.confirm(
        `¿Redirigir el expediente #${id} a la sede ${destino?.nombre ?? ""}?${aviso}`
      )
    ) {
      return;
    }

    setRedirigiendo(true);
    setMensajeAccion(null);
    try {
      const actualizada = await redirigirPostulacion(
        id,
        regionId,
        motivoRedireccion.trim() || undefined
      );
      setPostulacion(actualizada);
      setRedirigirAbierto(false);
      setMotivoRedireccion("");
      setSedeDestino("");
      setMensajeAccion({
        tipo: "exito",
        texto: `Expediente redirigido a la sede ${actualizada.region.nombre}.`,
      });
      if (perderaAcceso) {
        setTimeout(() => router.push("/revisor"), 1800);
      }
    } catch {
      setMensajeAccion({
        tipo: "error",
        texto: "No se pudo redirigir el expediente. Intenta de nuevo.",
      });
    } finally {
      setRedirigiendo(false);
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
            <h2 className="text-[20px] font-semibold text-on-surface">
              Auditoría de Expediente
            </h2>
            <p className="text-[13px] text-on-surface-variant">
              Exp. #{id} • {postulacion.region.nombre} •{" "}
              {new Date(postulacion.creadoEn).toLocaleDateString("es-PE")}
            </p>
          </div>
        </div>
        <span className={`px-sm py-xs rounded-full text-[13px] font-semibold border ${badge.bg} ${badge.text} border-current/20`}>
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
              <h3 className="text-[15px] font-semibold text-on-surface uppercase mb-sm">
                {nombreCompleto}
              </h3>
              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <p className="text-[13px] text-on-surface-variant">DNI</p>
                  <p className="text-[15px] text-on-surface flex items-center gap-xs">
                    {postulacion.dni}
                    <span className="material-symbols-outlined text-status-aprobado-text text-base">
                      check_circle
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[13px] text-on-surface-variant">Correo</p>
                  <p className="text-[13px] text-on-surface truncate">{postulacion.gmail}</p>
                </div>
                <div>
                  <p className="text-[13px] text-on-surface-variant">Carrera</p>
                  <p className="text-[15px] text-on-surface">
                    {postulacion.carrera ? `Ing. ${postulacion.carrera.nombre}` : "Por asignar"}
                  </p>
                </div>
                <div>
                  <p className="text-[13px] text-on-surface-variant">Región</p>
                  <p className="text-[15px] text-on-surface">{postulacion.region.nombre}</p>
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
                    <span className="text-[13px] text-on-surface-variant font-medium truncate">
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
              <p className="text-[13px] font-semibold text-on-surface mb-sm">
                Historial de observaciones:
              </p>
              {postulacion.observaciones.map((obs) => (
                <div
                  key={obs.id}
                  className="text-[13px] text-on-surface-variant border-l-2 border-status-observado-text pl-sm mb-sm"
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
            <h3 className="text-[20px] font-semibold text-on-surface mb-md">Panel de Decisión</h3>

            {/* Resumen de validación */}
            <div className="mb-md p-sm bg-surface-container-low rounded-lg border border-outline-variant">
              <p className="text-[13px] font-medium text-on-surface mb-sm">Estado de documentos:</p>
              {[
                { label: "Fotografía", estado: estadoFoto },
                { label: "Título Profesional", estado: estadoTitulo },
                { label: "Comprobante de Pago", estado: estadoVoucher },
              ].map(({ label, estado }) => (
                <div key={label} className="flex items-center justify-between py-xs">
                  <span className="text-[13px] text-on-surface-variant">{label}</span>
                  <span
                    className={`text-[13px] font-medium ${iconoValidacion(estado)}`}
                  >
                    {estado === "correcto" ? "✓ Correcto" : estado === "observado" ? "⚠ Observado" : "— Sin validar"}
                  </span>
                </div>
              ))}
            </div>

            {/* Asignar especialidad */}
            <div className="mb-md">
              <label className="block text-[13px] font-medium text-on-surface-variant mb-xs">
                Asignar Capítulo / Especialidad CIP{" "}
                <span className="text-error">*</span>
              </label>
              <input
                type="text"
                list="catalogo-especialidades"
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                disabled={yaDecidido}
                placeholder="Escriba o seleccione del catálogo CIP..."
                className="w-full bg-surface-bright border border-outline-variant rounded-lg px-md py-sm text-[15px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors disabled:opacity-60"
              />
              <datalist id="catalogo-especialidades">
                {carreras.map((c) => (
                  <option key={c.id} value={`Ing. ${c.nombre}`} />
                ))}
              </datalist>
              <p className="text-[12px] text-on-surface-variant/70 mt-xs">
                Puede elegir una del catálogo o escribir una especialidad nueva.
              </p>
            </div>

            {/* Fecha de colegiatura (permite fechas pasadas para probar deudas) */}
            <div className="mb-md">
              <label className="block text-[13px] font-medium text-on-surface-variant mb-xs">
                Fecha de Colegiatura (Alta)
              </label>
              <input
                type="date"
                value={fechaAlta}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setFechaAlta(e.target.value)}
                disabled={yaDecidido}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg px-md py-sm text-[15px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors disabled:opacity-60"
              />
              <p className="text-[12px] text-on-surface-variant/70 mt-xs">
                Déjalo vacío para usar la fecha de hoy. Una fecha pasada generará
                mensualidades pendientes acumuladas.
              </p>
            </div>

            {/* Observaciones */}
            <div className="mb-md p-sm rounded-lg bg-status-observado-bg/30 border border-status-observado-text/20">
              <label className="block text-[13px] font-medium text-on-surface-variant mb-xs">
                Observaciones{" "}
                <span className="text-[13px] text-on-surface-variant/70">
                  (obligatorio para observar)
                </span>
              </label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                disabled={yaDecidido}
                placeholder="Describa detalladamente las observaciones encontradas en los documentos..."
                rows={4}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg px-md py-sm text-[15px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none placeholder:text-on-surface-variant/50 disabled:opacity-60"
              />
              {/* Qué habilita esta observación: lo que el postulante podrá reemplazar */}
              {camposObservados.length > 0 ? (
                <p className="text-[12px] text-on-surface-variant mt-sm">
                  El postulante solo podrá reemplazar:{" "}
                  <strong className="text-status-observado-text">
                    {camposObservados.map((c) => CAMPO_LABEL[c]).join(" · ")}
                  </strong>
                </p>
              ) : (
                <p className="text-[12px] text-on-surface-variant/70 mt-sm">
                  Marca con <strong>&quot;Obs.&quot;</strong> los documentos a corregir. Solo esos
                  podrán reemplazarse al subsanar.
                </p>
              )}
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
                  disabled={procesando || camposObservados.length === 0}
                  title={
                    camposObservados.length === 0
                      ? 'Marca al menos un documento con "Obs." para poder observar'
                      : undefined
                  }
                  className="w-full bg-primary text-on-primary text-[15px] font-semibold h-12 rounded-lg flex items-center justify-center gap-sm hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {procesando && <Spinner />}
                  <span className="material-symbols-outlined text-xl">send</span>
                  Enviar Observación
                </button>
                <button
                  onClick={handleAprobar}
                  disabled={procesando || !especialidad.trim()}
                  className="w-full bg-status-aprobado-bg border border-status-aprobado-text/30 text-status-aprobado-text text-[15px] font-semibold h-12 rounded-lg flex items-center justify-center gap-sm hover:bg-status-aprobado-bg/80 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Redirigir a otra sede */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md shadow-sm">
            <div className="flex items-start justify-between gap-sm">
              <div>
                <h3 className="text-[15px] font-semibold text-on-surface flex items-center gap-xs">
                  <span className="material-symbols-outlined text-lg text-on-surface-variant">
                    move_location
                  </span>
                  Redirigir a otra sede
                </h3>
                <p className="text-[12px] text-on-surface-variant mt-xs">
                  Sede actual: <strong>{postulacion.region.nombre}</strong>
                </p>
              </div>
              {!yaDecidido && (
                <button
                  onClick={() => setRedirigirAbierto((v) => !v)}
                  className="text-[13px] font-medium text-primary hover:underline shrink-0"
                >
                  {redirigirAbierto ? "Cancelar" : "Cambiar"}
                </button>
              )}
            </div>

            {yaDecidido ? (
              <p className="text-[12px] text-on-surface-variant/70 mt-sm">
                Un expediente ya decidido no puede cambiar de sede.
              </p>
            ) : (
              redirigirAbierto && (
                <div className="mt-md flex flex-col gap-sm">
                  <div>
                    <label className="block text-[13px] font-medium text-on-surface-variant mb-xs">
                      Sede de destino <span className="text-error">*</span>
                    </label>
                    <select
                      value={sedeDestino}
                      onChange={(e) => setSedeDestino(e.target.value)}
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg px-md py-sm text-[15px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    >
                      <option value="">Seleccione una sede...</option>
                      {regiones
                        .filter((r) => r.id !== postulacion.regionId)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nombre}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-on-surface-variant mb-xs">
                      Motivo{" "}
                      <span className="text-on-surface-variant/70">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={motivoRedireccion}
                      onChange={(e) => setMotivoRedireccion(e.target.value)}
                      maxLength={200}
                      placeholder="Ej. el postulante indicó una sede equivocada"
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg px-md py-sm text-[15px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors placeholder:text-on-surface-variant/50"
                    />
                  </div>

                  <button
                    onClick={handleRedirigir}
                    disabled={redirigiendo || !sedeDestino}
                    className="w-full bg-surface-container-high border border-outline-variant text-on-surface text-[15px] font-semibold h-11 rounded-lg flex items-center justify-center gap-sm hover:bg-surface-container-highest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {redirigiendo && <Spinner />}
                    <span className="material-symbols-outlined text-xl">swap_horiz</span>
                    Redirigir expediente
                  </button>

                  <p className="text-[12px] text-on-surface-variant/70">
                    El expediente pasará a la bandeja de la sede elegida y su código CIP se
                    generará con el correlativo de esa sede.
                  </p>
                </div>
              )
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
