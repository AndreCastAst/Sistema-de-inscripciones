"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { consultarDNI } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import type { Region, Carrera, FormDatosPersonales } from "@/types";

const schema = z.object({
  dni: z.string().length(8, "El DNI debe tener exactamente 8 dígitos").regex(/^\d+$/, "Solo números"),
  nombres: z.string().min(2, "Requerido"),
  apellidoPaterno: z.string().min(2, "Requerido"),
  apellidoMaterno: z.string().min(2, "Requerido"),
  gmail: z.string().email("Correo inválido"),
  regionId: z.coerce.number().positive("Selecciona una región"),
  carreraId: z.coerce.number().positive("Selecciona una carrera"),
});

interface Props {
  regiones: Region[];
  carreras: Carrera[];
  onSiguiente: (datos: FormDatosPersonales) => void;
}

export function PasoDatosPersonales({ regiones, carreras, onSiguiente }: Props) {
  const [buscandoDNI, setBuscandoDNI] = useState(false);
  const [errorDNI, setErrorDNI] = useState<string | null>(null);
  const [dniVerificado, setDniVerificado] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormDatosPersonales>({
    resolver: zodResolver(schema),
  });

  async function buscarDNI() {
    const dni = getValues("dni");
    if (dni.length !== 8 || !/^\d+$/.test(dni)) {
      setErrorDNI("Ingresa un DNI válido de 8 dígitos");
      return;
    }
    setBuscandoDNI(true);
    setErrorDNI(null);
    setDniVerificado(false);
    try {
      const datos = await consultarDNI(dni);
      setValue("nombres", datos.nombres, { shouldValidate: true });
      setValue("apellidoPaterno", datos.apellidoPaterno, { shouldValidate: true });
      setValue("apellidoMaterno", datos.apellidoMaterno, { shouldValidate: true });
      setDniVerificado(true);
    } catch {
      setErrorDNI("DNI no encontrado en RENIEC. Verifica el número e intenta de nuevo.");
    } finally {
      setBuscandoDNI(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSiguiente)} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Datos personales</h2>

      {/* DNI */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          DNI <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            {...register("dni")}
            maxLength={8}
            placeholder="12345678"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={buscarDNI}
            disabled={buscandoDNI}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {buscandoDNI ? <Spinner /> : null}
            Verificar
          </button>
        </div>
        {errors.dni && <p className="text-red-500 text-sm mt-1">{errors.dni.message}</p>}
        {errorDNI && <p className="text-red-500 text-sm mt-1">{errorDNI}</p>}
        {dniVerificado && (
          <p className="text-green-600 text-sm mt-1">DNI verificado correctamente</p>
        )}
      </div>

      {/* Nombres (readonly tras verificar RENIEC) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
          <input
            {...register("nombres")}
            readOnly={dniVerificado}
            className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${dniVerificado ? "bg-gray-50 text-gray-600" : ""}`}
          />
          {errors.nombres && <p className="text-red-500 text-sm mt-1">{errors.nombres.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apellido paterno</label>
          <input
            {...register("apellidoPaterno")}
            readOnly={dniVerificado}
            className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${dniVerificado ? "bg-gray-50 text-gray-600" : ""}`}
          />
          {errors.apellidoPaterno && <p className="text-red-500 text-sm mt-1">{errors.apellidoPaterno.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apellido materno</label>
          <input
            {...register("apellidoMaterno")}
            readOnly={dniVerificado}
            className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${dniVerificado ? "bg-gray-50 text-gray-600" : ""}`}
          />
          {errors.apellidoMaterno && <p className="text-red-500 text-sm mt-1">{errors.apellidoMaterno.message}</p>}
        </div>
      </div>

      {/* Gmail */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Correo electrónico <span className="text-red-500">*</span>
        </label>
        <input
          {...register("gmail")}
          type="email"
          placeholder="tu@gmail.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.gmail && <p className="text-red-500 text-sm mt-1">{errors.gmail.message}</p>}
      </div>

      {/* Región y Carrera */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Región <span className="text-red-500">*</span>
          </label>
          <select
            {...register("regionId")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Selecciona una región</option>
            {regiones.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
          {errors.regionId && <p className="text-red-500 text-sm mt-1">{errors.regionId.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Carrera <span className="text-red-500">*</span>
          </label>
          <select
            {...register("carreraId")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Selecciona una carrera</option>
            {carreras.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          {errors.carreraId && <p className="text-red-500 text-sm mt-1">{errors.carreraId.message}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Siguiente →
        </button>
      </div>
    </form>
  );
}
