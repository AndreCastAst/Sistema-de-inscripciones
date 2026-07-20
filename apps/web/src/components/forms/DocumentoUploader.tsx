"use client";

import { useRef } from "react";
import { Spinner } from "@/components/ui/Spinner";
import type { CampoObservable, PostulacionDetalle } from "@/types";

export type EstadoArchivo = "idle" | "subiendo" | "listo" | "error";

export const TODOS_LOS_CAMPOS: CampoObservable[] = ["foto", "titulo", "voucher"];

/** Orden de presentación, independiente de cómo los marcó el revisor. */
export const ORDEN_CAMPOS: CampoObservable[] = ["titulo", "foto", "voucher"];

/**
 * Documentos que el revisor marcó en la última observación: los únicos
 * editables. Si la observación es anterior a esta función no trae campos, y en
 * ese caso se habilitan todos para no dejar el expediente sin salida.
 */
export function camposEditables(p: PostulacionDetalle): CampoObservable[] {
  const ultima = p.observaciones[0]; // el backend las devuelve más reciente primero
  return ultima?.campos?.length ? ultima.campos : TODOS_LOS_CAMPOS;
}

export const CONFIG_DOC: Record<
  CampoObservable,
  { titulo: string; ayuda: string; accept: string; icono: string; cta: string; formato: string; cargado: string }
> = {
  titulo: {
    titulo: "Título Profesional (PDF)",
    ayuda: "Cargue nuevamente su título en formato PDF claro y legible.",
    accept: "application/pdf",
    icono: "picture_as_pdf",
    cta: "Subir Título Profesional Corregido",
    formato: "PDF · Máx. 10 MB",
    cargado: "✓ Título cargado",
  },
  foto: {
    titulo: "Fotografía (JPG/PNG · Proporción 3:4)",
    ayuda: "Debe ser proporción 3:4 (alto/ancho), fondo blanco, sin accesorios.",
    accept: "image/jpeg,image/png",
    icono: "add_a_photo",
    cta: "Subir Fotografía Corregida",
    formato: "JPG/PNG · Proporción 3:4",
    cargado: "✓ Fotografía cargada",
  },
  voucher: {
    titulo: "Comprobante de Pago (JPG/PNG/PDF)",
    ayuda: "Adjunte el voucher legible, donde se vea el número de operación y el monto.",
    accept: "image/jpeg,image/png,application/pdf",
    icono: "receipt_long",
    cta: "Subir Comprobante Corregido",
    formato: "JPG/PNG/PDF · Máx. 10 MB",
    cargado: "✓ Comprobante cargado",
  },
};

export function DocumentoUploader({
  campo,
  estado,
  tienePrevio,
  onArchivo,
}: {
  campo: CampoObservable;
  estado: EstadoArchivo;
  tienePrevio: boolean;
  onArchivo: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const cfg = CONFIG_DOC[campo];

  return (
    <div className="border border-status-observado-text/30 rounded-lg p-md bg-status-observado-bg/30">
      <div className="flex items-start gap-md mb-md">
        <span className="material-symbols-outlined text-status-observado-text mt-xs">info</span>
        <div className="flex-1">
          <h4 className="text-[15px] font-semibold text-on-surface mb-xs">{cfg.titulo}</h4>
          <p className="text-[15px] text-on-surface-variant">{cfg.ayuda}</p>
        </div>
      </div>
      <input
        type="file"
        ref={ref}
        className="hidden"
        accept={cfg.accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onArchivo(f);
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`w-full border-2 border-dashed rounded-xl p-lg flex flex-col items-center gap-sm transition-colors cursor-pointer ${
          estado === "listo"
            ? "border-status-aprobado-text/40 bg-status-aprobado-bg/20"
            : estado === "error"
            ? "border-error/40 bg-error-container/20"
            : "border-status-observado-text bg-surface-container-lowest hover:bg-surface-bright"
        }`}
      >
        {estado === "subiendo" ? (
          <>
            <Spinner />
            <span className="text-[13px] text-on-surface-variant mt-sm">Subiendo...</span>
          </>
        ) : estado === "listo" ? (
          <>
            <span
              className="material-symbols-outlined text-status-aprobado-text"
              style={{ fontSize: "36px", fontVariationSettings: "'FILL' 1" }}
            >
              task
            </span>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-status-aprobado-text">{cfg.cargado}</p>
              <p className="text-[13px] text-on-surface-variant">Haz clic para reemplazar</p>
            </div>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-status-observado-text" style={{ fontSize: "36px" }}>
              {cfg.icono}
            </span>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-on-surface">{cfg.cta}</p>
              <p className="text-[13px] text-on-surface-variant">{cfg.formato}</p>
            </div>
          </>
        )}
      </button>
      {estado === "error" && <p className="text-error text-[13px] mt-sm">Error al subir. Intenta de nuevo.</p>}
      {tienePrevio && estado === "idle" && (
        <p className="text-[13px] text-on-surface-variant mt-sm">
          Archivo actual registrado — será reemplazado al subir uno nuevo.
        </p>
      )}
    </div>
  );
}
