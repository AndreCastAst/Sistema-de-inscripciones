import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Colegio de Ingenieros del Perú – Inscripciones",
  description: "Sistema de inscripciones MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
