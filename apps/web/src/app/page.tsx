import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-3xl font-bold text-center">
        Colegio de Ingenieros del Perú
      </h1>
      <p className="text-gray-600 text-center max-w-md">
        Plataforma de inscripción y gestión de colegiados.
      </p>
      <div className="flex gap-4">
        <Link
          href="/postulante"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Inscribirme
        </Link>
        <Link
          href="/revisor"
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
        >
          Acceso Revisor
        </Link>
      </div>
    </main>
  );
}
