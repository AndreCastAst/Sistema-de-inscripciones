import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4 py-16 gap-10">
      {/* Logo / título */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-white text-2xl font-bold">CIP</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Colegio de Ingenieros del Perú</h1>
        <p className="text-gray-500 max-w-md">
          Sistema de inscripción y gestión de colegiados. Registra tu expediente en línea y recibe
          tu carnet digital.
        </p>
      </div>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Link
          href="/postulante"
          className="flex-1 text-center px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-sm"
        >
          Inscribirme
        </Link>
        <Link
          href="/revisor"
          className="flex-1 text-center px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold"
        >
          Acceso revisor
        </Link>
      </div>

      {/* Info del flujo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full text-center text-sm text-gray-500 mt-4">
        {[
          { paso: "1", texto: "Completa tu solicitud con datos verificados por RENIEC" },
          { paso: "2", texto: "El revisor de tu región evalúa tu expediente" },
          { paso: "3", texto: "Recibes tu código y carnet digital de colegiado" },
        ].map(({ paso, texto }) => (
          <div key={paso} className="space-y-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center mx-auto">
              {paso}
            </div>
            <p>{texto}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
