import Link from "next/link";

export default function AuditoriaIndexPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-md text-center p-xl">
      <span
        className="material-symbols-outlined text-outline"
        style={{ fontSize: "56px" }}
      >
        fact_check
      </span>
      <h2 className="text-[20px] font-semibold text-on-surface">Auditoría Documental</h2>
      <p className="text-[15px] text-on-surface-variant max-w-sm">
        Selecciona un expediente desde la Bandeja de Expedientes para iniciar la revisión
        documental.
      </p>
      <Link
        href="/revisor"
        className="bg-primary text-on-primary text-[15px] font-semibold px-lg py-2.5 rounded-lg hover:brightness-110 transition-all flex items-center gap-sm"
      >
        <span className="material-symbols-outlined text-xl">folder_shared</span>
        Ir a Bandeja de Expedientes
      </Link>
    </div>
  );
}
