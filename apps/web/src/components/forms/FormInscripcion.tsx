"use client";

import { useState, useEffect } from "react";
import { getRegiones, getCarreras } from "@/lib/api";
import { PasoDatosPersonales } from "./PasoDatosPersonales";
import { PasoDocumentos } from "./PasoDocumentos";
import { PasoRevision } from "./PasoRevision";
import { PasoExito } from "./PasoExito";
import { Spinner } from "@/components/ui/Spinner";
import type { PasoInscripcion, FormDatosPersonales, Region, Carrera } from "@/types";

const PASOS: PasoInscripcion[] = ["datos", "documentos", "revision", "enviado"];
const LABELS: Record<PasoInscripcion, string> = {
  datos: "Datos personales",
  documentos: "Documentos",
  revision: "Revisión",
  enviado: "Enviado",
};

export function FormInscripcion() {
  const [paso, setPaso] = useState<PasoInscripcion>("datos");
  const [datosPersonales, setDatosPersonales] = useState<FormDatosPersonales | null>(null);
  const [urlsDocumentos, setUrlsDocumentos] = useState<{
    fotoUrl: string;
    tituloUrl: string;
    voucherUrl: string;
  } | null>(null);
  const [postulacionId, setPostulacionId] = useState<number | null>(null);

  const [regiones, setRegiones] = useState<Region[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

  useEffect(() => {
    // Intenta cargar del backend; si falla usa datos de ejemplo para poder ver el formulario
    Promise.all([getRegiones(), getCarreras()])
      .then(([r, c]) => { setRegiones(r); setCarreras(c); })
      .catch(() => {
        setRegiones([
          { id: 1, nombre: "Lima" }, { id: 2, nombre: "Arequipa" },
          { id: 3, nombre: "Cusco" }, { id: 4, nombre: "La Libertad" },
          { id: 5, nombre: "Piura" },
        ]);
        setCarreras([
          { id: 1, nombre: "Civil" }, { id: 2, nombre: "Sistemas" },
          { id: 3, nombre: "Industrial" }, { id: 4, nombre: "Mecánica" },
          { id: 5, nombre: "Eléctrica" },
        ]);
      })
      .finally(() => setCargandoCatalogos(false));
  }, []);

  const indicePaso = PASOS.indexOf(paso);

  if (cargandoCatalogos) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
        <Spinner /> Cargando...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Barra de progreso — oculta en el paso final */}
      {paso !== "enviado" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {PASOS.filter((p) => p !== "enviado").map((p, i) => {
              const activo = p === paso;
              const completado = PASOS.indexOf(p) < indicePaso;
              return (
                <div key={p} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${completado ? "bg-blue-600 text-white" : activo ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}
                    >
                      {completado ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs mt-1 ${activo ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                      {LABELS[p]}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 ${completado ? "bg-blue-600" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contenido del paso actual */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        {paso === "datos" && (
          <PasoDatosPersonales
            regiones={regiones}
            carreras={carreras}
            onSiguiente={(d) => {
              setDatosPersonales(d);
              setPaso("documentos");
            }}
          />
        )}

        {paso === "documentos" && (
          <PasoDocumentos
            onSiguiente={(urls) => {
              setUrlsDocumentos(urls);
              setPaso("revision");
            }}
            onAtras={() => setPaso("datos")}
          />
        )}

        {paso === "revision" && datosPersonales && urlsDocumentos && (
          <PasoRevision
            datos={datosPersonales}
            urls={urlsDocumentos}
            regiones={regiones}
            carreras={carreras}
            onExito={(id) => {
              setPostulacionId(id);
              setPaso("enviado");
            }}
            onAtras={() => setPaso("documentos")}
          />
        )}

        {paso === "enviado" && postulacionId !== null && (
          <PasoExito />
        )}
      </div>
    </div>
  );
}
