interface Props {
  params: { codigo: string };
}

export default function CarnetPage({ params }: Props) {
  return (
    <main className="flex items-center justify-center min-h-screen p-8">
      <div className="border rounded-xl p-8 w-80 shadow-lg text-center">
        <h2 className="text-xl font-bold mb-2">Carnet de Colegiado</h2>
        <p className="text-gray-500 text-sm mb-4">Código: {params.codigo}</p>
        {/* TODO: obtener datos del colegiado y renderizar carnet */}
        <p className="text-gray-400 italic">Cargando datos...</p>
      </div>
    </main>
  );
}
