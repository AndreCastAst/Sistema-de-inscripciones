"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/ui/NavBar";
import { Spinner } from "@/components/ui/Spinner";
import {
  consultarEstadoPago,
  crearCheckoutInscripcion,
  confirmarPagoInscripcion,
} from "@/lib/api";

interface Props {
  params: { id: string };
}

// MercadoPago aprueba el pago y redirige de inmediato, pero la notificación al
// webhook puede tardar unos segundos. Se consulta el estado varias veces antes
// de dar el pago por no confirmado.
const REINTENTOS = 8;
const ESPERA_MS = 2500;

export default function RetornoPagoPage({ params }: Props) {
  const id = Number(params.id);
  const searchParams = useSearchParams();
  const resultado = searchParams.get("pago"); // exitoso | fallido | pendiente

  const [pagado, setPagado] = useState(false);
  const [referencia, setReferencia] = useState<string | null>(null);
  const [gmail, setGmail] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(resultado === "exitoso");
  const [error, setError] = useState<string | null>(null);
  const [reintentando, setReintentando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function verificar() {
      // MercadoPago devuelve el payment_id en la URL de retorno. Confirmarlo
      // directamente evita esperar al webhook, que puede tardar o no llegar.
      const paymentId = searchParams.get("payment_id") ?? searchParams.get("collection_id");
      if (paymentId) {
        try {
          const r = await confirmarPagoInscripcion(id, paymentId);
          if (cancelado) return;
          if (r.pagado) {
            setPagado(true);
            setReferencia(r.referencia ?? null);
            setVerificando(false);
            return;
          }
        } catch {
          // Si falla, se cae al sondeo del estado (el webhook puede resolverlo).
        }
      }

      for (let intento = 0; intento < REINTENTOS; intento++) {
        if (cancelado) return;
        try {
          const estado = await consultarEstadoPago(id);
          if (cancelado) return;
          setGmail(estado.gmail);
          if (estado.pagado) {
            setPagado(true);
            setReferencia(estado.referencia);
            setVerificando(false);
            return;
          }
        } catch {
          if (cancelado) return;
          setError("No pudimos consultar el estado de tu solicitud.");
          setVerificando(false);
          return;
        }
        await new Promise((r) => setTimeout(r, ESPERA_MS));
      }
      if (!cancelado) setVerificando(false);
    }

    // Solo tiene sentido esperar la confirmación si MercadoPago dijo que aprobó.
    if (resultado === "exitoso") {
      verificar();
    } else {
      consultarEstadoPago(id)
        .then((e) => {
          if (cancelado) return;
          setGmail(e.gmail);
          setPagado(e.pagado);
          setReferencia(e.referencia);
        })
        .catch(() => {});
    }

    return () => {
      cancelado = true;
    };
  }, [id, resultado, searchParams]);

  const reintentarPago = useCallback(async () => {
    setReintentando(true);
    setError(null);
    try {
      const preferencia = await crearCheckoutInscripcion(id);
      window.location.href = preferencia.init_point;
    } catch {
      setError("No se pudo iniciar el pago. Intenta de nuevo en unos minutos.");
      setReintentando(false);
    }
  }, [id]);

  const expediente = `#CIP-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`;

  return (
    <>
      <NavBar activeTab="portal" />
      <main className="flex-grow w-full max-w-[672px] mx-auto px-md md:px-lg py-xl">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          {/* Cabecera según el resultado */}
          <div
            className={`px-lg py-lg text-center border-b border-outline-variant ${
              pagado
                ? "bg-status-aprobado-bg"
                : verificando
                ? "bg-surface-container-low"
                : "bg-status-observado-bg"
            }`}
          >
            {verificando ? (
              <>
                <Spinner />
                <h1 className="text-[20px] font-semibold text-on-surface mt-md">
                  Confirmando tu pago...
                </h1>
                <p className="text-[14px] text-on-surface-variant mt-xs">
                  MercadoPago está notificando la operación. Esto toma unos segundos.
                </p>
              </>
            ) : pagado ? (
              <>
                <span
                  className="material-symbols-outlined text-status-aprobado-text"
                  style={{ fontSize: "64px", fontVariationSettings: "'FILL' 1" }}
                >
                  task_alt
                </span>
                <h1 className="text-[24px] font-bold text-on-surface mt-sm">¡Pago confirmado!</h1>
                <p className="text-[15px] text-on-surface-variant mt-xs">
                  Tu solicitud de inscripción quedó registrada y pasará a revisión.
                </p>
              </>
            ) : (
              <>
                <span
                  className="material-symbols-outlined text-status-observado-text"
                  style={{ fontSize: "64px" }}
                >
                  {resultado === "fallido" ? "error" : "schedule"}
                </span>
                <h1 className="text-[24px] font-bold text-on-surface mt-sm">
                  {resultado === "fallido" ? "El pago no se completó" : "Pago aún no confirmado"}
                </h1>
                <p className="text-[15px] text-on-surface-variant mt-xs">
                  {resultado === "fallido"
                    ? "MercadoPago rechazó o canceló la operación. Tu expediente quedó guardado."
                    : "Tu expediente está guardado. Si ya pagaste, la confirmación puede demorar unos minutos."}
                </p>
              </>
            )}
          </div>

          <div className="p-lg flex flex-col gap-md">
            <div className="grid grid-cols-2 gap-md">
              <div>
                <p className="text-[13px] text-on-surface-variant mb-xs">N° de Expediente</p>
                <p className="text-[15px] font-semibold text-on-surface">{expediente}</p>
              </div>
              <div>
                <p className="text-[13px] text-on-surface-variant mb-xs">Estado del pago</p>
                <p
                  className={`text-[15px] font-semibold ${
                    pagado ? "text-status-aprobado-text" : "text-status-observado-text"
                  }`}
                >
                  {pagado ? "Pagado" : "Pendiente"}
                </p>
              </div>
              {referencia && (
                <div className="col-span-2">
                  <p className="text-[13px] text-on-surface-variant mb-xs">Referencia</p>
                  <p className="text-[13px] font-mono text-on-surface break-all">{referencia}</p>
                </div>
              )}
            </div>

            {pagado && gmail && (
              <div className="bg-status-aprobado-bg/40 border border-status-aprobado-text/20 rounded-lg p-md text-[13px] text-on-surface-variant">
                Enviamos la confirmación a <strong className="text-on-surface">{gmail}</strong>. Un
                revisor evaluará tu expediente y te notificará por ese correo.
              </div>
            )}

            {error && (
              <div className="bg-error-container border border-error/20 text-error rounded-lg px-md py-sm text-[14px] flex items-center gap-sm">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-sm justify-end pt-sm">
              <Link
                href="/"
                className="h-[48px] px-lg rounded-lg flex items-center justify-center text-[15px] font-semibold border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
              >
                Volver al inicio
              </Link>
              {!pagado && !verificando && (
                <button
                  type="button"
                  onClick={reintentarPago}
                  disabled={reintentando}
                  className="h-[48px] px-xl rounded-lg flex items-center justify-center gap-sm text-[15px] font-semibold bg-primary text-on-primary hover:brightness-110 transition-all disabled:opacity-60"
                >
                  {reintentando ? <Spinner /> : <span className="material-symbols-outlined text-xl">payments</span>}
                  Reintentar el pago
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
