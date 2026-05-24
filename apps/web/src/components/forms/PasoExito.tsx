export function PasoExito() {
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

      <div className="text-sm text-gray-500 space-y-1">
        <p>Recibirás un correo cuando tu expediente sea revisado.</p>
        <p>Si hay observaciones, podrás subsanarlas desde el mismo correo.</p>
      </div>

      <a
        href="/"
        className="inline-block mt-4 px-8 py-3 bg-primary text-on-primary font-semibold rounded-xl hover:brightness-110 active:scale-95 transition-all"
      >
        Salir
      </a>
    </div>
  );
}
