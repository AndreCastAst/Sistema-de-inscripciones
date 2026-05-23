"use client";

import { useState, useRef } from "react";
import { subirImagen, subirPDF } from "@/lib/cloudinary";
import { Spinner } from "@/components/ui/Spinner";
import type { ArchivoCargado } from "@/types";

interface Props {
  onSiguiente: (urls: { fotoUrl: string; tituloUrl: string; voucherUrl: string }) => void;
  onAtras: () => void;
}

type CampoArchivo = "foto" | "titulo" | "voucher";

const CONFIG: Record<CampoArchivo, { label: string; accept: string; maxMB: number; descripcion: string }> = {
  foto: {
    label: "Fotografía",
    accept: "image/jpeg,image/png",
    maxMB: 2,
    descripcion: "JPG o PNG, máx 2 MB, fondo blanco, ratio 3:4",
  },
  titulo: {
    label: "Título profesional",
    accept: "application/pdf",
    maxMB: 5,
    descripcion: "PDF, máx 5 MB",
  },
  voucher: {
    label: "Comprobante de pago (S/1500)",
    accept: "image/jpeg,image/png,application/pdf",
    maxMB: 5,
    descripcion: "JPG, PNG o PDF, máx 5 MB",
  },
};

function useCarga() {
  return useState<ArchivoCargado>({ estado: "idle", url: null, error: null });
}

export function PasoDocumentos({ onSiguiente, onAtras }: Props) {
  const [foto, setFoto] = useCarga();
  const [titulo, setTitulo] = useCarga();
  const [voucher, setVoucher] = useCarga();

  const estado: Record<CampoArchivo, ArchivoCargado> = { foto, titulo, voucher };
  const setEstado: Record<CampoArchivo, (v: ArchivoCargado) => void> = {
    foto: setFoto,
    titulo: setTitulo,
    voucher: setVoucher,
  };

  const fotoRef = useRef<HTMLInputElement>(null);
  const tituloRef = useRef<HTMLInputElement>(null);
  const voucherRef = useRef<HTMLInputElement>(null);
  const refs: Record<CampoArchivo, React.RefObject<HTMLInputElement | null>> = {
    foto: fotoRef,
    titulo: tituloRef,
    voucher: voucherRef,
  };

  async function manejarArchivo(campo: CampoArchivo, file: File) {
    const cfg = CONFIG[campo];
    if (file.size > cfg.maxMB * 1024 * 1024) {
      setEstado[campo]({ estado: "error", url: null, error: `El archivo supera los ${cfg.maxMB} MB` });
      return;
    }

    setEstado[campo]({ estado: "subiendo", url: null, error: null });
    try {
      const esPDF = file.type === "application/pdf";
      const url = esPDF ? await subirPDF(file) : await subirImagen(file);
      setEstado[campo]({ estado: "listo", url, error: null });
    } catch {
      setEstado[campo]({ estado: "error", url: null, error: "Error al subir. Intenta de nuevo." });
    }
  }

  const todosListos =
    foto.estado === "listo" &&
    titulo.estado === "listo" &&
    voucher.estado === "listo";

  function continuar() {
    if (!foto.url || !titulo.url || !voucher.url) return;
    onSiguiente({ fotoUrl: foto.url, tituloUrl: titulo.url, voucherUrl: voucher.url });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Documentos requeridos</h2>
      <p className="text-sm text-gray-500">
        Sube los tres archivos antes de continuar. Los documentos se guardan de forma segura.
      </p>

      {(["foto", "titulo", "voucher"] as CampoArchivo[]).map((campo) => {
        const cfg = CONFIG[campo];
        const est = estado[campo];
        const ref = refs[campo];

        return (
          <div key={campo} className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-800">{cfg.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{cfg.descripcion}</p>
              </div>
              {est.estado === "listo" && (
                <span className="text-green-600 text-sm font-medium">✓ Subido</span>
              )}
              {est.estado === "error" && (
                <span className="text-red-500 text-sm font-medium">✗ Error</span>
              )}
            </div>

            <div className="mt-3">
              {/* Preview de imagen */}
              {est.estado === "listo" && est.url && campo === "foto" && (
                <img
                  src={est.url}
                  alt="Vista previa"
                  className="w-20 h-28 object-cover rounded border mb-2"
                />
              )}

              {est.estado === "subiendo" ? (
                <div className="flex items-center gap-2 text-blue-600 text-sm">
                  <Spinner /> Subiendo...
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    accept={cfg.accept}
                    ref={ref as React.RefObject<HTMLInputElement>}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) manejarArchivo(campo, file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => ref.current?.click()}
                    className={`text-sm px-3 py-1.5 rounded-lg border ${
                      est.estado === "listo"
                        ? "border-green-300 text-green-700 hover:bg-green-50"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {est.estado === "listo" ? "Cambiar archivo" : "Seleccionar archivo"}
                  </button>
                </>
              )}

              {est.error && <p className="text-red-500 text-sm mt-1">{est.error}</p>}
            </div>
          </div>
        );
      })}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onAtras}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          ← Atrás
        </button>
        <button
          type="button"
          onClick={continuar}
          disabled={!todosListos}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 font-medium"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
