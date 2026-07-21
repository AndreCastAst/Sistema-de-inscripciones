"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Spinner } from "./Spinner";

const INTERVALO_MS = 3000;

/**
 * Muestra el link de MercadoPago como QR en vez de redirigir el navegador
 * actual a la pasarela. En ventanilla el pago lo hace el cliente desde su
 * propio celular (Yape/Plin/tarjeta): si en cambio se redirige la PC del
 * cajero, todos los clientes del día terminan pagando desde el mismo
 * dispositivo/IP con identidades distintas, un patrón que el antifraude de
 * MercadoPago bloquea con "Te protegimos de un pago sospechoso".
 *
 * Sondea `verificarPago` en segundo plano porque, al no redirigir, no vuelve
 * ningún payment_id por la URL: la única señal de que se pagó es consultar el
 * estado (que el webhook actualiza cuando MercadoPago confirma).
 */
export function QRPago({
  url,
  monto,
  verificarPago,
  onConfirmado,
  onCancelar,
}: {
  url: string;
  monto?: number;
  verificarPago: () => Promise<boolean>;
  onConfirmado: () => void;
  onCancelar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    let cancelado = false;
    let timer: ReturnType<typeof setTimeout>;

    async function sondear() {
      if (cancelado) return;
      try {
        const pagado = await verificarPago();
        if (cancelado) return;
        if (pagado) {
          onConfirmado();
          return;
        }
      } catch {
        // Un error de red puntual no debe detener el sondeo.
      }
      if (!cancelado) timer = setTimeout(sondear, INTERVALO_MS);
    }

    timer = setTimeout(sondear, INTERVALO_MS);
    const contador = setInterval(() => setSegundos((s) => s + 1), 1000);

    return () => {
      cancelado = true;
      clearTimeout(timer);
      clearInterval(contador);
    };
  }, [verificarPago, onConfirmado]);

  function copiarLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <div className="flex flex-col items-center gap-lg text-center bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
      <div>
        <h3 className="text-[18px] font-semibold text-on-surface">Escanea para pagar</h3>
        <p className="text-[14px] text-on-surface-variant mt-xs max-w-sm">
          Pide al cliente que escanee el código con la cámara o la app de Yape/Plin de su celular.
          {monto !== undefined && (
            <>
              {" "}
              El monto es <strong className="text-on-surface">S/ {monto.toFixed(2)}</strong>.
            </>
          )}
        </p>
      </div>

      <div className="bg-white p-md rounded-xl border border-outline-variant">
        <QRCodeSVG value={url} size={220} />
      </div>

      <div className="flex flex-col items-center gap-xs">
        <button
          type="button"
          onClick={copiarLink}
          className="text-[13px] text-primary underline underline-offset-2 hover:no-underline"
        >
          {copiado ? "¡Enlace copiado!" : "Copiar enlace de pago"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
        >
          ¿Ya estás en tu celular? Toca aquí para pagar directamente
        </a>
      </div>

      <div className="flex items-center gap-sm text-[13px] text-on-surface-variant bg-surface-container-low rounded-lg px-md py-sm">
        <Spinner className="h-4 w-4" />
        Esperando confirmación del pago... ({segundos}s)
      </div>

      <button
        type="button"
        onClick={onCancelar}
        className="text-[13px] text-on-surface-variant hover:text-on-surface underline underline-offset-2"
      >
        Cancelar y volver
      </button>
    </div>
  );
}
