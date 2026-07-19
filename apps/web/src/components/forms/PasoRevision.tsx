"use client";

import { useState } from "react";
import { crearPostulacion } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import type { FormDatosPersonales, Region, Carrera } from "@/types";

interface Props {
  datos: FormDatosPersonales;
  urls: { fotoUrl: string; tituloUrl: string; voucherUrl: string };
  regiones: Region[];
  carreras: Carrera[];
  onExito: (id: number) => void;
  onAtras: () => void;
}

export function PasoRevision({ datos, urls, regiones, carreras, onExito, onAtras }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regionNombre = regiones.find((r) => r.id === Number(datos.regionId))?.nombre ?? "-";
  const carreraNombre = carreras.find((c) => c.id === Number(datos.carreraId))?.nombre ?? "-";

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const postulacion = await crearPostulacion({
        ...datos,
        regionId: Number(datos.regionId),
        carreraId: Number(datos.carreraId),
        ...urls,
      });
      onExito(postulacion.id);
    } catch {
      setError("Ocurrió un error al enviar la solicitud. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Revisión de tu solicitud</h2>
      <p className="text-sm text-gray-500">
        Verifica que todo esté correcto antes de enviar. Una vez enviado, el revisor de tu región
        evaluará tu expediente.
      </p>

      {/* Foto + datos básicos */}
      <div className="flex gap-4 items-start p-4 bg-gray-50 rounded-xl border border-gray-200">
        <img
          src={urls.fotoUrl}
          alt="Fotografía"
          className="w-20 h-28 object-cover rounded border border-gray-300 flex-shrink-0"
        />
        <div className="space-y-1">
          <p className="font-semibold text-gray-900 text-lg">
            {datos.nombres} {datos.apellidoPaterno} {datos.apellidoMaterno}
          </p>
          <p className="text-sm text-gray-600">DNI: {datos.dni}</p>
          <p className="text-sm text-gray-600">Correo: {datos.gmail}</p>
          <p className="text-sm text-gray-600">Región: {regionNombre}</p>
          <p className="text-sm text-gray-600">Carrera: Ingeniería {carreraNombre}</p>
        </div>
      </div>

      {/* Documentos */}
      <div className="space-y-2">
        <p className="font-medium text-gray-700">Documentos adjuntos</p>
        {[
          { label: "Título profesional", url: urls.tituloUrl },
          { label: "Comprobante de pago", url: urls.voucherUrl },
        ].map(({ label, url }) => (
          <div key={label} className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
            <span className="text-gray-700">{label}</span>
            {url.startsWith("SIM-") ? (
              <span className="text-green-600 font-medium flex items-center gap-1">
                ✓ Pago simulado S/3
              </span>
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Ver archivo
              </a>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onAtras}
          disabled={enviando}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-40"
        >
          ← Atrás
        </button>
        <button
          type="button"
          onClick={enviar}
          disabled={enviando}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          {enviando ? <Spinner /> : null}
          {enviando ? "Enviando..." : "Enviar solicitud"}
        </button>
      </div>
    </div>
  );
}
