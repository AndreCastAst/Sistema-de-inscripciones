import Link from "next/link";
import { FormInscripcion } from "@/components/forms/FormInscripcion";

export default function PostulantePage() {
  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver al inicio
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-3">Solicitud de colegiatura</h1>
        <p className="text-gray-500 mt-1">
          Completa los tres pasos para enviar tu expediente al Colegio de Ingenieros del Perú.
        </p>
      </div>

      <FormInscripcion />
    </main>
  );
}
