import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middlewares/validate";
import { consultarDNI } from "../services/reniec";
import { firmarUrl } from "../services/cloudinary";

const router = Router();
const prisma = new PrismaClient();

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
  voucherUrl: z.string().url().optional(),
  esFisico: z.boolean().optional().default(false),
});

// POST /api/v1/postulantes — registro virtual (postulante) o físico (secretario)
router.post("/", validate(postulacionSchema), async (req, res, next) => {
  try {
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

const subsanacionSchema = z.object({
  fotoUrl: z.string().url().optional(),
  tituloUrl: z.string().url().optional(),
  voucherUrl: z.string().url().optional(),
}).refine(
  (data) => data.fotoUrl || data.tituloUrl || data.voucherUrl,
  { message: "Debe enviar al menos un documento para subsanar" }
);

// PATCH /api/v1/postulantes/:id — subsanación de documentos observados
router.patch("/:id", validate(subsanacionSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const actual = await prisma.postulacion.findUniqueOrThrow({ where: { id } });

    if (actual.estado !== "OBSERVADO") {
      return res.status(400).json({
        error: "Solo se pueden subsanar postulaciones en estado OBSERVADO",
      });
    }

    const { fotoUrl, tituloUrl, voucherUrl } = req.body;
    const postulacion = await prisma.postulacion.update({
      where: { id },
      data: {
        ...(fotoUrl && { fotoUrl }),
        ...(tituloUrl && { tituloUrl }),
        ...(voucherUrl && { voucherUrl }),
        estado: "SUBSANADO",
      },
    });

    await prisma.auditoria.create({
      data: {
        accion: "SUBSANACION",
        entidad: "Postulacion",
        entidadId: id,
      },
    });

    res.json(postulacion);
  } catch (err) {
    next(err);
  }
});

export { router as postulanteRoutes };
