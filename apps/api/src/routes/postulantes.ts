import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middlewares/validate";
import { consultarDNI } from "../services/reniec";
import { firmarUrl } from "../services/cloudinary";
import { enviarConfirmacionDePago, registrarPagoVentanilla } from "../services/confirmacion";
import { aplicarSubsanacion, subsanacionSchema } from "../services/subsanacion";

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/postulantes/buscar/:dni — consulta pública de expediente activo por DNI
router.get("/buscar/:dni", async (req, res, next) => {
  try {
    const postulacion = await prisma.postulacion.findFirst({
      where: {
        dni: req.params.dni,
        estado: { in: ["PENDIENTE", "OBSERVADO", "SUBSANADO"] },
      },
      include: {
        region: true,
        carrera: true,
        observaciones: { orderBy: { creadoEn: "desc" }, take: 10 },
      },
      orderBy: { creadoEn: "desc" },
    });
    if (!postulacion) {
      return res.status(404).json({ error: "No se encontró expediente activo para ese DNI" });
    }
    res.json(postulacion);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/postulantes/dni/:dni — validación RENIEC
router.get("/dni/:dni", async (req, res, next) => {
  try {
    const datos = await consultarDNI(req.params.dni);
    res.json(datos);
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status ?? 404;
    const apiMsg = err?.response?.data?.message ?? "";
    if (status === 401 || apiMsg.toLowerCase().includes("token")) {
      return next({ status: 503, message: "Servicio RENIEC no disponible temporalmente" });
    }
    next({ status: 404, message: "DNI no encontrado en RENIEC" });
  }
});

const postulacionSchema = z.object({
  dni: z.string().length(8, "El DNI debe tener 8 dígitos"),
  nombres: z.string().min(2),
  apellidoPaterno: z.string().min(2),
  apellidoMaterno: z.string().min(2),
  gmail: z.string().email("Correo electrónico inválido"),
  regionId: z.number().int().positive(),
  carreraId: z.number().int().positive().optional(),
  fotoUrl: z.string().url().optional(),
  tituloUrl: z.string().url().optional(),
  voucherUrl: z.string().optional(),
  esFisico: z.boolean().optional().default(false),
});

// POST /api/v1/postulantes — registro virtual (postulante) o físico (secretario)
router.post("/", validate(postulacionSchema), async (req, res, next) => {
  try {
    // Verificar que el DNI no tenga ya un código CIP (no esté colegiado)
    const colegiado = await prisma.colegiado.findUnique({
      where: { dni: req.body.dni },
      select: { codigo: true },
    });
    if (colegiado) {
      return res.status(409).json({
        error: `Este DNI ya se encuentra colegiado (código CIP ${colegiado.codigo}). No se puede registrar una nueva solicitud.`,
        codigoCIP: colegiado.codigo,
      });
    }

    // Verificar que no exista postulación PENDIENTE o EN_REVISION con ese DNI
    const existe = await prisma.postulacion.findFirst({
      where: {
        dni: req.body.dni,
        estado: { in: ["PENDIENTE", "EN_REVISION", "OBSERVADO", "SUBSANADO"] },
      },
    });
    if (existe) {
      return res.status(409).json({
        error: "Ya existe una solicitud activa con ese DNI",
        postulacionId: existe.id,
      });
    }

    const postulacion = await prisma.postulacion.create({ data: req.body });

    await prisma.auditoria.create({
      data: {
        accion: req.body.esFisico ? "REGISTRO_FISICO" : "REGISTRO_VIRTUAL",
        entidad: "Postulacion",
        entidadId: postulacion.id,
        detalle: `DNI: ${postulacion.dni}`,
      },
    });

    // Con MercadoPago el expediente nace sin pago y el correo lo dispara la
    // confirmación del cobro; avisar acá anunciaría un pago que no ocurrió.
    const ref = postulacion.voucherUrl;
    if (ref?.startsWith("SIM-")) {
      // Cobro en ventanilla: se emite la boleta y queda como comprobante. Acá sí
      // se espera, porque el cajero necesita el enlace para entregársela a la
      // persona en el momento; el correo se envía aparte sin bloquear.
      const comprobanteUrl = await registrarPagoVentanilla(postulacion.id, ref).catch((err) => {
        console.error(`[Boleta] Error al emitir comprobante de #${postulacion.id}:`, err?.message ?? err);
        return null;
      });
      return res.status(201).json({ ...postulacion, voucherUrl: comprobanteUrl ?? ref, comprobanteUrl });
    } else if (ref) {
      // Voucher bancario ya adjunto por el postulante.
      enviarConfirmacionDePago(postulacion.id).catch((err) =>
        console.error(`[Email] Error al enviar confirmación a ${postulacion.gmail}:`, err?.message ?? err)
      );
    }

    res.status(201).json(postulacion);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/postulantes/:id — consulta de estado para el postulante
router.get("/:id", async (req, res, next) => {
  try {
    const postulacion = await prisma.postulacion.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: {
        region: true,
        carrera: true,
        observaciones: {
          orderBy: { creadoEn: "desc" },
          take: 5,
        },
      },
    });
    res.json(postulacion);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/postulantes/subsanacion/:token — abre el expediente desde el
// enlace del correo, sin pedir DNI. Devuelve solo lo necesario para la pantalla.
router.get("/subsanacion/:token", async (req, res, next) => {
  try {
    const postulacion = await prisma.postulacion.findUnique({
      where: { tokenSubsanacion: req.params.token },
      include: {
        region: true,
        carrera: true,
        observaciones: { orderBy: { creadoEn: "desc" }, take: 5 },
      },
    });

    if (!postulacion) {
      return res.status(404).json({ error: "Este enlace no es válido o ya fue utilizado" });
    }
    if (postulacion.estado !== "OBSERVADO") {
      return res.status(409).json({
        error: "Este expediente ya no requiere subsanación",
        estado: postulacion.estado,
      });
    }

    res.json(postulacion);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/postulantes/subsanacion/:token — subsanación desde el enlace
// del correo. Misma lógica que por id, pero identificando por token.
router.patch("/subsanacion/:token", validate(subsanacionSchema), async (req, res, next) => {
  try {
    const actual = await prisma.postulacion.findUnique({
      where: { tokenSubsanacion: req.params.token },
    });
    if (!actual) {
      return res.status(404).json({ error: "Este enlace no es válido o ya fue utilizado" });
    }
    res.json(await aplicarSubsanacion(actual.id, req.body));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/postulantes/:id — subsanación de documentos observados
router.patch("/:id", validate(subsanacionSchema), async (req, res, next) => {
  try {
    res.json(await aplicarSubsanacion(Number(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
});

export { router as postulanteRoutes };
