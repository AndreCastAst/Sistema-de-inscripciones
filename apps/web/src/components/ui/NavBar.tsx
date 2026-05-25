import Link from "next/link";

interface NavBarProps {
  activeTab?: "portal" | "carnet";
}

export function NavBar({ activeTab = "portal" }: NavBarProps) {
  return (
    <header className="bg-surface dark:bg-inverse-surface border-b border-surface-variant sticky top-0 z-50">
      <div className="flex justify-between items-center px-lg py-md w-full max-w-container-max-admin mx-auto">
        {/* Marca */}
        <div className="flex items-center gap-sm">
          <div className="w-10 h-10 bg-primary rounded flex items-center justify-center shrink-0">
            <span className="text-on-primary font-bold text-sm select-none">CIP</span>
          </div>
          <span className="font-display-lg text-display-lg text-primary dark:text-primary-fixed uppercase tracking-tight hidden md:block">
            CIP - Sistema de Inscripciones
          </span>
          <span className="font-headline-lg-mobile text-headline-lg-mobile text-primary dark:text-primary-fixed uppercase tracking-tight md:hidden">
            CIP
          </span>
        </div>

        {/* Navegación (desktop) */}
        <nav className="hidden md:flex gap-lg">
          <Link
            href="/"
            className={`font-body-bold py-2 cursor-pointer active:opacity-80 transition-colors ${
              activeTab === "portal"
                ? "text-primary border-b-2 border-primary"
                : "text-on-surface-variant font-body-medium hover:text-primary"
            }`}
          >
            Portal Público
          </Link>
          <Link
            href="/carnet"
            className={`font-body-bold py-2 cursor-pointer active:opacity-80 transition-colors ${
              activeTab === "carnet"
                ? "text-primary border-b-2 border-primary"
                : "text-on-surface-variant font-body-medium hover:text-primary"
            }`}
          >
            Consulta de Carnet y Pagos
          </Link>
        </nav>

        {/* Acceso administrativo */}
        <Link
          href="/revisor/login"
          className="hidden md:flex h-[40px] px-lg rounded-lg items-center justify-center font-body-bold bg-primary-container text-on-primary hover:opacity-90 transition-opacity shadow-sm"
        >
          Acceso Administrativo
        </Link>

        {/* Menú móvil */}
        <button className="md:hidden text-primary">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
    </header>
  );
}
