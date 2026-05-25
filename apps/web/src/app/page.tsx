"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { NavBar } from "@/components/ui/NavBar";
import { Spinner } from "@/components/ui/Spinner";
import { consultarDNI, crearPostulacion, crearCheckoutMP, getRegiones } from "@/lib/api";
import { subirImagen, subirPDF } from "@/lib/cloudinary";

const schema = z.object({
  dni: z.string().length(8, "El DNI debe tener exactamente 8 dígitos").regex(/^\d+$/, "Solo números"),
  nombres: z.string().min(2, "Requerido"),
  apellidoPaterno: z.string().min(2, "Requerido"),
  apellidoMaterno: z.string().min(2, "Requerido"),
  gmail: z.string().email("Correo inválido"),
  regionId: z.coerce.number().positive("Selecciona una región"),
});

type FormData = z.infer<typeof schema>;

type EstadoCarga = "idle" | "subiendo" | "listo" | "error";

interface ArchivoState {
  estado: EstadoCarga;
  url: string | null;
  error: string | null;
  preview?: string;
  mensajeCarga?: string;
}

const archivoInicial: ArchivoState = { estado: "idle", url: null, error: null };

// ── Subcomponente de zona de carga ──────────────────────────────────────────

interface ZonaCargaProps {
  archivo: ArchivoState;
  onClick: () => void;
  icono: string;
  titulo: string;
  descripcion: string;
  mensajeCarga?: string;
}

function ZonaCarga({ archivo, onClick, icono, titulo, descripcion, mensajeCarga = "Subiendo..." }: ZonaCargaProps) {
  const borderClass =
    archivo.estado === "listo"
      ? "border-status-aprobado-text/40 bg-status-aprobado-bg/20"
      : archivo.estado === "error"
      ? "border-error/40 bg-error-container/20"
      : "border-outline-variant bg-surface-bright hover:bg-surface-container-low";

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        className={`w-full border-2 border-dashed rounded-lg p-md text-center flex flex-col items-center justify-center min-h-[160px] transition-colors group ${borderClass}`}
      >
        {archivo.estado === "subiendo" ? (
          <>
            <Spinner />
            <span className="font-body-medium text-body-medium text-on-surface-variant mt-sm">{mensajeCarga}</span>
          </>
        ) : archivo.estado === "listo" && archivo.preview ? (
          <>
            <img
              src={archivo.preview}
              alt="Vista previa"
              className="w-20 h-28 object-cover rounded border border-outline-variant mb-sm"
            />
            <span className="font-label-sm text-label-sm text-status-aprobado-text">✓ Subido correctamente</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-xs">Toca para cambiar</span>
          </>
        ) : archivo.estado === "listo" ? (
          <>
            <span
              className="material-symbols-outlined text-status-aprobado-text text-3xl mb-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              task
            </span>
            <span className="font-label-sm text-label-sm text-status-aprobado-text">✓ Subido correctamente</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-xs">Toca para cambiar</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-outline text-3xl mb-sm group-hover:text-primary transition-colors">
              {icono}
            </span>
            <span className="font-body-medium text-body-medium text-on-surface mb-xs">{titulo}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant text-center max-w-[200px]">{descripcion}</span>
          </>
        )}
      </button>
      {archivo.error && (
        <p className="text-error font-label-sm text-label-sm mt-xs">{archivo.error}</p>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function HomePage() {
  const [dniVerificado, setDniVerificado] = useState(false);
  const [buscandoDNI, setBuscandoDNI] = useState(false);
  const [errorDNI, setErrorDNI] = useState<string | null>(null);
  const [modoManual, setModoManual] = useState(false);
  const [foto, setFoto] = useState<ArchivoState>(archivoInicial);
  const [titulo, setTitulo] = useState<ArchivoState>(archivoInicial);
  const [voucher, setVoucher] = useState<ArchivoState>(archivoInicial);
  const [metodoPago, setMetodoPago] = useState<"integrated" | "voucher">("integrated");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [expedienteId, setExpedienteId] = useState<number | null>(null);
  const [correoEnviado, setCorreoEnviado] = useState<string | null>(null);
  const [voucherPagoRef, setVoucherPagoRef] = useState<string | null>(null);

  const fotoRef = useRef<HTMLInputElement>(null);
  const tituloRef = useRef<HTMLInputElement>(null);
  const voucherRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    reset,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const [watchNombres, watchApPat, watchApMat] = watch(["nombres", "apellidoPaterno", "apellidoMaterno"]);
  const nombreCompleto = [watchNombres, watchApPat, watchApMat].filter(Boolean).join(" ");

  // Detectar retorno desde MercadoPago
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const id = params.get("id");
    const paymentId = params.get("payment_id");

    if ((pago === "exitoso" || pago === "pendiente") && id) {
      setExpedienteId(Number(id));
      setVoucherPagoRef(paymentId ? `mp:${paymentId}` : "mp:procesando");
      const gmail = sessionStorage.getItem("mp_gmail");
      if (gmail) {
        setCorreoEnviado(gmail);
        sessionStorage.removeItem("mp_gmail");
      }
      window.history.replaceState({}, "", "/");
    }
    if (pago === "fallido") {
      setErrorEnvio("El pago fue rechazado o cancelado. Puedes intentarlo de nuevo.");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // Obtener el ID de La Libertad al montar (región institucional fija)
  useEffect(() => {
    getRegiones()
      .then((regiones) => {
        const laLibertad = regiones.find((r) => r.nombre === "La Libertad");
        if (laLibertad) setValue("regionId", laLibertad.id, { shouldValidate: true });
      })
      .catch(() => {
        setValue("regionId", 5, { shouldValidate: true });
      });
  }, [setValue]);

  async function validarDNI() {
    const dni = getValues("dni");
    if (!/^\d{8}$/.test(dni)) {
      setErrorDNI("Ingresa un DNI válido de 8 dígitos");
      return;
    }
    setBuscandoDNI(true);
    setErrorDNI(null);
    setDniVerificado(false);
    setModoManual(false);
    try {
      const datos = await consultarDNI(dni);
      setValue("nombres", datos.nombres, { shouldValidate: true });
      setValue("apellidoPaterno", datos.apellidoPaterno, { shouldValidate: true });
      setValue("apellidoMaterno", datos.apellidoMaterno, { shouldValidate: true });
      setDniVerificado(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "";
      if (err?.response?.status === 503 || msg.toLowerCase().includes("no disponible")) {
        setErrorDNI("El servicio RENIEC no está disponible. Puedes ingresar tus datos manualmente.");
        setModoManual(true);
      } else {
        setErrorDNI("DNI no encontrado en RENIEC. Verifica el número e intenta de nuevo.");
      }
    } finally {
      setBuscandoDNI(false);
    }
  }

  function activarModoManual() {
    const dni = getValues("dni");
    if (!/^\d{8}$/.test(dni)) {
      setErrorDNI("Ingresa un DNI válido de 8 dígitos primero");
      return;
    }
    setModoManual(true);
    setErrorDNI(null);
    setDniVerificado(true);
  }

  async function iniciarPagoMP() {
    const valid = await trigger();
    if (!valid) return;
    if (foto.estado !== "listo" || titulo.estado !== "listo") {
      setErrorEnvio("Debes subir la foto y el título profesional antes de proceder al pago.");
      return;
    }
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const formData = getValues();
      let postulacionId: number;

      try {
        const postulacion = await crearPostulacion({
          ...formData,
          regionId: Number(formData.regionId),
          fotoUrl: foto.url!,
          tituloUrl: titulo.url!,
          voucherUrl: undefined,
        });
        postulacionId = postulacion.id;
      } catch (err: any) {
        if (err?.response?.status === 409 && err?.response?.data?.postulacionId) {
          postulacionId = err.response.data.postulacionId;
        } else {
          throw err;
        }
      }

      const checkout = await crearCheckoutMP(postulacionId);
      sessionStorage.setItem("mp_gmail", formData.gmail);
      window.location.href = checkout.is_sandbox ? checkout.sandbox_init_point : checkout.init_point;
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? "Error desconocido";
      setErrorEnvio(`Error al iniciar el pago: ${msg}`);
      setEnviando(false);
    }
  }

  async function manejarArchivo(
    tipo: "foto" | "titulo" | "voucher",
    file: File,
    setter: (s: ArchivoState) => void
  ) {
    if (tipo === "foto") {
      setter({ estado: "subiendo", url: null, error: null, mensajeCarga: "Analizando imagen..." });
      try {
        const { validarFoto } = await import("@/lib/validarFoto");
        const resultado = await validarFoto(file);
        if (!resultado.valido) {
          setter({ estado: "error", url: null, error: resultado.error ?? "Foto no válida." });
          return;
        }
      } catch {
        setter({ estado: "error", url: null, error: "Error al analizar la imagen. Intenta de nuevo." });
        return;
      }
      setter({ estado: "subiendo", url: null, error: null, mensajeCarga: "Subiendo..." });
      try {
        const preview = URL.createObjectURL(file);
        const url = await subirImagen(file);
        setter({ estado: "listo", url, error: null, preview });
      } catch {
        setter({ estado: "error", url: null, error: "Error al subir. Intenta de nuevo." });
      }
      return;
    }

    const maxMB = 5;
    if (file.size > maxMB * 1024 * 1024) {
      setter({ estado: "error", url: null, error: `El archivo supera los ${maxMB} MB` });
      return;
    }
    setter({ estado: "subiendo", url: null, error: null });
    try {
      const esPDF = file.type === "application/pdf";
      const url = esPDF ? await subirPDF(file) : await subirImagen(file);
      setter({ estado: "listo", url, error: null });
    } catch {
      setter({ estado: "error", url: null, error: "Error al subir. Intenta de nuevo." });
    }
  }

  const puedeEnviar =
    dniVerificado &&
    foto.estado === "listo" &&
    titulo.estado === "listo" &&
    metodoPago === "voucher" &&
    voucher.estado === "listo";

  async function onSubmit(data: FormData) {
    if (!foto.url || !titulo.url || !voucher.url) return;

    setEnviando(true);
    setErrorEnvio(null);
    try {
      const result = await crearPostulacion({
        ...data,
        regionId: Number(data.regionId),
        fotoUrl: foto.url,
        tituloUrl: titulo.url,
        voucherUrl: voucher.url,
      });
      setExpedienteId(result.id);
      setCorreoEnviado(data.gmail);
      setVoucherPagoRef(voucher.url);
    } catch {
      setErrorEnvio("Ocurrió un error al enviar la solicitud. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function resetFormulario() {
    reset();
    setDniVerificado(false);
    setErrorDNI(null);
    setModoManual(false);
    setFoto(archivoInicial);
    setTitulo(archivoInicial);
    setVoucher(archivoInicial);
    setMetodoPago("integrated");
    setErrorEnvio(null);
    setExpedienteId(null);
    setCorreoEnviado(null);
    setVoucherPagoRef(null);
  }

  // ── Estado de éxito ───────────────────────────────────────────────────────

  if (expedienteId !== null) {
    const esPasarela = voucherPagoRef?.startsWith("SIM-") || voucherPagoRef?.startsWith("mp:");
    const fechaActual = new Date().toLocaleDateString("es-PE", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    const horaActual = new Date().toLocaleTimeString("es-PE", {
      hour: "2-digit", minute: "2-digit",
    });

    return (
      <>
        <NavBar activeTab="portal" />
        <main className="flex-grow py-xl px-md md:px-lg">
          <div className="max-w-container-max-form mx-auto space-y-md">

            {/* Banner de éxito */}
            <div className="bg-status-aprobado-bg border border-status-aprobado-text/30 rounded-xl p-lg flex items-center gap-md">
              <span
                className="material-symbols-outlined text-status-aprobado-text shrink-0"
                style={{ fontSize: "48px", fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">¡Solicitud enviada con éxito!</h2>
                <p className="font-body-base text-body-base text-on-surface-variant mt-xs">
                  Tu expediente fue recibido y se encuentra en espera de revisión.
                </p>
              </div>
            </div>

            {/* Comprobante — solo para pago por pasarela integrada */}
            {esPasarela ? (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                <div className="bg-surface-container-low px-lg py-md border-b border-outline-variant text-center">
                  <p className="font-body-bold text-body-bold text-on-surface tracking-wider uppercase">
                    Comprobante de Solicitud de Inscripción
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">
                    Colegio de Ingenieros del Perú · RUC: 20100149286
                  </p>
                </div>
                <div className="p-lg space-y-sm">
                  <div className="flex justify-between border-b border-outline-variant pb-sm">
                    <span className="font-body-base text-body-base text-on-surface-variant">Fecha y hora</span>
                    <span className="font-body-medium text-body-medium text-on-surface">{fechaActual} {horaActual}</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant pb-sm">
                    <span className="font-body-base text-body-base text-on-surface-variant">Concepto</span>
                    <span className="font-body-medium text-body-medium text-on-surface">Derecho de Inscripción – CIP</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant pb-sm">
                    <span className="font-body-base text-body-base text-on-surface-variant">Monto pagado</span>
                    <span className="font-body-bold text-body-bold text-primary">S/ 1,500.00</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant pb-sm">
                    <span className="font-body-base text-body-base text-on-surface-variant">Método de pago</span>
                    <span className="font-body-medium text-body-medium text-on-surface">
                      {voucherPagoRef?.startsWith("mp:") ? "MercadoPago" : "Pasarela integrada"}
                    </span>
                  </div>
                  {voucherPagoRef && voucherPagoRef !== "mp:procesando" && (
                    <div className="flex justify-between border-b border-outline-variant pb-sm">
                      <span className="font-body-base text-body-base text-on-surface-variant">Referencia de pago</span>
                      <span className="font-mono font-label-sm text-label-sm text-on-surface">{voucherPagoRef}</span>
                    </div>
                  )}
                  <div className="flex justify-between pb-sm">
                    <span className="font-body-base text-body-base text-on-surface-variant">Estado</span>
                    <span className="font-body-medium text-body-medium text-status-pendiente-text">⏳ Pendiente de revisión</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Voucher externo — el pago será verificado manualmente */
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm flex items-start gap-md">
                <span className="material-symbols-outlined text-status-pendiente-text shrink-0 mt-xs" style={{ fontSize: "32px" }}>
                  hourglass_top
                </span>
                <div>
                  <p className="font-body-bold text-body-bold text-on-surface">Comprobante en verificación</p>
                  <p className="font-body-base text-body-base text-on-surface-variant mt-xs">
                    Tu voucher bancario fue recibido. El revisor lo validará en las próximas{" "}
                    <strong className="text-on-surface">24–48 horas hábiles</strong> y te notificará por correo.
                  </p>
                  <div className="mt-md flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-base">info</span>
                    Fecha de envío: {fechaActual} {horaActual}
                  </div>
                </div>
              </div>
            )}

            {/* Aviso de correo enviado */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-md flex items-start gap-sm">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0 mt-xs">
                mark_email_read
              </span>
              <div>
                <p className="font-body-bold text-body-bold text-on-surface">
                  Correo de confirmación enviado
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">
                  Se envió un comprobante con los detalles de tu solicitud a{" "}
                  <strong className="text-primary">{correoEnviado}</strong>.
                  Revisa también tu carpeta de spam si no lo encuentras en unos minutos.
                </p>
              </div>
            </div>

            {/* Qué sigue */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
              <p className="font-body-bold text-body-bold text-on-surface mb-sm">¿Qué sigue?</p>
              <ol className="space-y-xs font-body-base text-body-base text-on-surface-variant list-decimal list-inside">
                <li>Un revisor de tu región evaluará tu expediente.</li>
                <li>Si hay observaciones, recibirás un correo indicando qué corregir.</li>
                <li>Al ser aprobado recibirás tu código de colegiado por correo.</li>
              </ol>
            </div>

            <div className="flex justify-center pt-sm">
              <a
                href="/"
                className="bg-primary text-on-primary font-body-bold text-body-bold px-xl py-sm rounded-lg hover:brightness-110 transition-all shadow-sm"
              >
                Nueva solicitud
              </a>
            </div>

          </div>
        </main>
      </>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────

  return (
    <>
      <NavBar activeTab="portal" />
      <main className="flex-grow py-xl px-md md:px-lg">
        <div className="max-w-container-max-form mx-auto bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          {/* Cabecera del formulario */}
          <div className="bg-surface-container-low px-lg py-md border-b border-outline-variant/30 text-center">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">
              Formulario de Inscripción Virtual
            </h2>
            <p className="font-body-base text-body-base text-on-surface-variant">
              Complete los datos solicitados con veracidad para iniciar su proceso de colegiatura.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-lg md:p-xl space-y-xl">
            {/* ── Sección: Identidad ─────────────────────────────────────── */}
            <section>
              <div className="flex items-center gap-sm mb-md border-b border-surface-variant pb-sm">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  badge
                </span>
                <h3 className="font-body-bold text-body-bold text-on-surface">
                  Identidad del Postulante
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {/* DNI */}
                <div className="flex flex-col gap-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">
                    Documento de Identidad (DNI)
                  </label>
                  <div className="flex gap-sm">
                    <input
                      {...register("dni")}
                      maxLength={8}
                      placeholder="Ingrese 8 dígitos"
                      className="flex-grow font-body-base text-body-base bg-surface-container-lowest border border-outline-variant rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-on-surface-variant/50"
                    />
                    <button
                      type="button"
                      onClick={validarDNI}
                      disabled={buscandoDNI}
                      className={`flex items-center gap-xs px-md rounded border font-body-bold transition-colors disabled:opacity-60 ${
                        dniVerificado
                          ? "bg-status-aprobado-bg text-status-aprobado-text border-status-aprobado-text/30"
                          : "bg-surface-container text-primary border-outline-variant hover:bg-secondary-container"
                      }`}
                    >
                      {buscandoDNI && <Spinner />}
                      {dniVerificado ? "Verificado" : "Validar"}
                    </button>
                  </div>
                  {errors.dni && (
                    <p className="text-error font-label-sm text-label-sm">{errors.dni.message}</p>
                  )}
                  {errorDNI && (
                    <div className="flex flex-col gap-xs">
                      <p className="text-error font-label-sm text-label-sm">{errorDNI}</p>
                      {modoManual && (
                        <button
                          type="button"
                          onClick={activarModoManual}
                          className="self-start font-label-sm text-label-sm text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                          Ingresar datos manualmente →
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Nombres: combinado (RENIEC) o campos manuales */}
                {dniVerificado && modoManual ? (
                  /* Manual: 3 campos editables en col-span-2 */
                  <div className="flex flex-col gap-xs md:col-span-2">
                    <div className="mb-xs p-sm rounded-lg bg-status-pendiente-bg border border-status-pendiente-text/30 flex items-center gap-sm font-label-sm text-label-sm text-status-pendiente-text">
                      <span className="material-symbols-outlined text-base">edit_note</span>
                      Ingresando datos manualmente — verifica que sean correctos
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                      <div className="flex flex-col gap-xs">
                        <label className="font-label-sm text-label-sm text-on-surface-variant">Nombres</label>
                        <input
                          {...register("nombres")}
                          placeholder="Nombres"
                          className="font-body-base text-body-base bg-surface-container-lowest border border-outline-variant rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                        {errors.nombres && (
                          <p className="text-error font-label-sm text-label-sm">{errors.nombres.message}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-xs">
                        <label className="font-label-sm text-label-sm text-on-surface-variant">
                          Apellido Paterno
                        </label>
                        <input
                          {...register("apellidoPaterno")}
                          placeholder="Apellido paterno"
                          className="font-body-base text-body-base bg-surface-container-lowest border border-outline-variant rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                        {errors.apellidoPaterno && (
                          <p className="text-error font-label-sm text-label-sm">{errors.apellidoPaterno.message}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-xs">
                        <label className="font-label-sm text-label-sm text-on-surface-variant">
                          Apellido Materno
                        </label>
                        <input
                          {...register("apellidoMaterno")}
                          placeholder="Apellido materno"
                          className="font-body-base text-body-base bg-surface-container-lowest border border-outline-variant rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                        {errors.apellidoMaterno && (
                          <p className="text-error font-label-sm text-label-sm">{errors.apellidoMaterno.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* RENIEC o pendiente: campo combinado readonly/disabled */
                  <div className="flex flex-col gap-xs md:col-span-2">
                    <label className="font-label-sm text-label-sm text-on-surface-variant">
                      Nombres y Apellidos (RENIEC)
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled={!dniVerificado}
                      value={dniVerificado ? nombreCompleto : ""}
                      placeholder="Esperando validación RENIEC"
                      className="font-body-base text-body-base bg-surface-container-high border border-outline-variant/50 rounded px-md py-sm text-on-secondary-fixed-variant cursor-not-allowed placeholder:text-on-surface-variant/50"
                    />
                    <input type="hidden" {...register("nombres")} />
                    <input type="hidden" {...register("apellidoPaterno")} />
                    <input type="hidden" {...register("apellidoMaterno")} />
                  </div>
                )}
              </div>
            </section>

            {/* ── Sección: Contacto ──────────────────────────────────────── */}
            <section>
              <div className="flex items-center gap-sm mb-md border-b border-surface-variant pb-sm">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  mail
                </span>
                <h3 className="font-body-bold text-body-bold text-on-surface">
                  Información de Contacto
                </h3>
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant">
                  Correo Electrónico Principal
                </label>
                <input
                  {...register("gmail")}
                  type="email"
                  placeholder="ejemplo@correo.com"
                  className="font-body-base text-body-base bg-surface-container-lowest border border-outline-variant rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                {errors.gmail && (
                  <p className="text-error font-label-sm text-label-sm">{errors.gmail.message}</p>
                )}
                <p className="font-label-sm text-label-sm text-on-surface-variant/70 mt-1">
                  Este correo será utilizado para todas las notificaciones oficiales.
                </p>
              </div>
              <input type="hidden" {...register("regionId")} />
            </section>

            {/* ── Sección: Documentos ───────────────────────────────────── */}
            <section>
              <div className="flex items-center gap-sm mb-md border-b border-surface-variant pb-sm">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  upload_file
                </span>
                <h3 className="font-body-bold text-body-bold text-on-surface">Carga de Requisitos</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                <input
                  type="file"
                  ref={fotoRef}
                  className="hidden"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) manejarArchivo("foto", f, setFoto);
                  }}
                />
                <ZonaCarga
                  archivo={foto}
                  onClick={() => fotoRef.current?.click()}
                  icono="add_a_photo"
                  titulo="Subir Fotografía (3:4)"
                  descripcion="Fondo blanco, vestimenta formal, rostro centrado. Máx 2MB (JPG/PNG)."
                  mensajeCarga={foto.mensajeCarga ?? "Analizando..."}
                />

                <input
                  type="file"
                  ref={tituloRef}
                  className="hidden"
                  accept="application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) manejarArchivo("titulo", f, setTitulo);
                  }}
                />
                <ZonaCarga
                  archivo={titulo}
                  onClick={() => tituloRef.current?.click()}
                  icono="description"
                  titulo="Título Profesional (PDF)"
                  descripcion="Escaneo legible de anverso y reverso. Máx 5MB."
                />
              </div>
            </section>

            {/* ── Sección: Pago ──────────────────────────────────────────── */}
            <section>
              <div className="flex items-center gap-sm mb-md border-b border-surface-variant pb-sm">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  payments
                </span>
                <h3 className="font-body-bold text-body-bold text-on-surface">Modalidad de Pago</h3>
              </div>
              <div className="space-y-sm">
                <label className="flex items-center gap-sm p-sm rounded-lg border cursor-pointer transition-colors bg-surface-bright has-[:checked]:bg-primary-fixed/20 has-[:checked]:border-primary border-outline-variant hover:bg-surface-container-low">
                  <input
                    type="radio"
                    name="payment_method"
                    value="integrated"
                    checked={metodoPago === "integrated"}
                    onChange={() => setMetodoPago("integrated")}
                    className="text-primary focus:ring-primary h-4 w-4 border-outline-variant"
                  />
                  <span className="font-body-medium text-body-medium text-on-surface flex-grow">
                    Pasarela Integrada — Yape, Plin, BCP, BBVA, Interbank y más
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">
                    account_balance
                  </span>
                </label>
                <label className="flex items-center gap-sm p-sm rounded-lg border cursor-pointer transition-colors bg-surface-bright has-[:checked]:bg-primary-fixed/20 has-[:checked]:border-primary border-outline-variant hover:bg-surface-container-low">
                  <input
                    type="radio"
                    name="payment_method"
                    value="voucher"
                    checked={metodoPago === "voucher"}
                    onChange={() => setMetodoPago("voucher")}
                    className="text-primary focus:ring-primary h-4 w-4 border-outline-variant"
                  />
                  <span className="font-body-medium text-body-medium text-on-surface flex-grow">
                    Voucher Externo (Depósito/Transferencia)
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">
                    receipt
                  </span>
                </label>
              </div>

              {/* Pasarela integrada: botón que redirige a MercadoPago */}
              {metodoPago === "integrated" && (
                <div className="mt-md space-y-sm">
                  <button
                    type="button"
                    onClick={iniciarPagoMP}
                    disabled={enviando}
                    className="w-full flex items-center justify-center gap-sm p-md bg-primary text-on-primary rounded-xl hover:brightness-110 active:scale-95 transition-all font-body-bold text-body-bold shadow-sm disabled:opacity-60"
                  >
                    {enviando ? (
                      <Spinner />
                    ) : (
                      <span className="material-symbols-outlined text-xl">account_balance</span>
                    )}
                    {enviando ? "Redirigiendo a MercadoPago..." : "Proceder al pago — S/ 1,500.00"}
                  </button>
                  <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
                    Serás redirigido a MercadoPago para completar el pago de forma segura.
                    Acepta tarjetas, Yape y más.
                  </p>
                </div>
              )}

              {/* Zona de carga del voucher */}
              {metodoPago === "voucher" && (
                <div className="mt-md">
                  <input
                    type="file"
                    ref={voucherRef}
                    className="hidden"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) manejarArchivo("voucher", f, setVoucher);
                    }}
                  />
                  <ZonaCarga
                    archivo={voucher}
                    onClick={() => voucherRef.current?.click()}
                    icono="upload_file"
                    titulo="Comprobante de Pago"
                    descripcion="Depósito o transferencia bancaria. JPG, PNG o PDF. Máx 5MB."
                  />
                </div>
              )}
            </section>

            {/* Error de envío */}
            {errorEnvio && (
              <div className="bg-error-container border border-error/20 text-error rounded-lg px-md py-sm flex items-start gap-sm font-body-base text-body-base">
                <span className="material-symbols-outlined text-lg mt-0.5">error</span>
                {errorEnvio}
              </div>
            )}

            {/* Botón de envío — solo para método voucher */}
            {metodoPago === "voucher" && (
              <div className="pt-md border-t border-surface-variant flex justify-end">
                <button
                  type="submit"
                  disabled={!puedeEnviar || enviando}
                  className="bg-primary text-on-primary font-body-bold text-body-bold py-3 px-xl rounded-lg disabled:opacity-50 hover:brightness-110 active:scale-95 transition-all shadow-sm flex items-center gap-sm"
                >
                  {enviando && <Spinner />}
                  {enviando ? "Enviando..." : "Enviar Solicitud"}
                  {!enviando && (
                    <span className="material-symbols-outlined text-lg">send</span>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </main>
    </>
  );
}
