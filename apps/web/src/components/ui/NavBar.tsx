import Link from "next/link";

interface NavBarProps {
  activeTab?: "portal" | "carnet";
}

export function NavBar({ activeTab = "portal" }: NavBarProps) {
  const linkBase =
    "py-2 text-[15px] font-medium transition-colors active:opacity-80";
  const linkActive = "text-primary border-b-2 border-primary font-semibold";
  const linkInactive = "text-on-surface-variant hover:text-primary";

  return (
    <header className="bg-surface border-b border-outline-variant sticky top-0 z-50">
      <div className="flex justify-between items-center px-lg py-md w-full max-w-container-admin mx-auto">
        {/* Marca */}
        <div className="flex items-center gap-sm">
          <div className="w-10 h-10 bg-primary rounded flex items-center justify-center shrink-0">
            <span className="text-on-primary font-bold text-sm select-none">CIP</span>
          </div>
          <span className="text-[20px] font-semibold text-primary uppercase tracking-tight hidden md:block">
            CIP – Sistema de Inscripciones
          </span>
          <span className="text-[20px] font-semibold text-primary uppercase tracking-tight md:hidden">
            CIP
          </span>
        </div>

        {/* Navegación (desktop) */}
        <nav className="hidden md:flex gap-lg">
          <Link href="/" className={`${linkBase} ${activeTab === "portal" ? linkActive : linkInactive}`}>
            Portal Público
          </Link>
          <Link href="/carnet" className={`${linkBase} ${activeTab === "carnet" ? linkActive : linkInactive}`}>
            Consulta de Carnet y Pagos
          </Link>
        </nav>

        {/* Acceso administrativo */}
        <Link
          href="/revisor/login"
          className="hidden md:block text-[15px] font-semibold bg-primary-container text-on-primary px-lg py-2.5 rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm"
        >
          Acceso Administrativo
        </Link>

        {/* Menú móvil (placeholder) */}
        <button className="md:hidden text-primary">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
    </header>
  );
}
