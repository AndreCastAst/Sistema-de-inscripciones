interface Props {
  postulacionId: number;
}

export function PasoExito({ postulacionId }: Props) {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">¡Solicitud enviada!</h2>
        <p className="text-gray-600 mt-2">
          Tu expediente fue recibido y será revisado por el administrador de tu región.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-4 inline-block">
        <p className="text-sm text-gray-500">Número de solicitud</p>
        <p className="text-3xl font-mono font-bold text-gray-900">#{postulacionId}</p>
      </div>

      <div className="text-sm text-gray-500 space-y-1">
        <p>Recibirás un correo cuando tu expediente sea revisado.</p>
        <p>Si hay observaciones, podrás subsanarlas desde el mismo correo.</p>
      </div>

      <a
        href="/"
        className="inline-block mt-4 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
      >
        Volver al inicio
      </a>
    </div>
  );
}
