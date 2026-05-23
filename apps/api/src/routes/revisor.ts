import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middlewares/validate";
import { generarCodigo } from "../services/correlativo";
import { enviarObservacion, enviarAprobacion } from "../services/resend";

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/revisor/bandeja?regionId=1
router.get("/bandeja", async (req, res, next) => {
  try {
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined;
    const postulaciones = await prisma.postulacion.findMany({
      where: {
        estado: { in: ["PENDIENTE", "SUBSANADO"] },
        ...(regionId && { regionId }),
      },
      include: { region: true, carrera: true },
      orderBy: { creadoEn: "asc" },
    });
    res.json(postulaciones);
  } catch (err) {
    next(err);
  }
});

const observarSchema = z.object({
  mensaje: z.string().min(10),
  revisorId: z.number().int().positive(),
});

// POST /api/v1/revisor/:id/observar
router.post("/:id/observar", validate(observarSchema), async (req, res, next) => {
  try {
    const postulacion = await prisma.postulacion.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
    });

    const obs = await prisma.observacion.create({
      data: {
        postulacionId: postulacion.id,
        mensaje: req.body.mensaje,
        revisorId: req.body.revisorId,
      },
    });

    await prisma.postulacion.update({
      where: { id: postulacion.id },
      data: { estado: "OBSERVADO" },
    });

    await enviarObservacion(postulacion.gmail, req.body.mensaje);

    res.json(obs);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/revisor/:id/aprobar
router.post("/:id/aprobar", async (req, res, next) => {
  try {
    const postulacion = await prisma.postulacion.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
    });

    const codigo = await generarCodigo(postulacion.regionId, postulacion.carreraId);

    const colegiado = await prisma.colegiado.create({
      data: {
        codigo,
        dni: postulacion.dni,
        nombres: postulacion.nombres,
        apellidoPaterno: postulacion.apellidoPaterno,
        apellidoMaterno: postulacion.apellidoMaterno,
        regionId: postulacion.regionId,
        carreraId: postulacion.carreraId,
        fotoUrl: postulacion.fotoUrl ?? undefined,
      },
    });

    await prisma.postulacion.update({
      where: { id: postulacion.id },
      data: { estado: "APROBADO" },
    });

    await enviarAprobacion(postulacion.gmail, codigo);

    res.status(201).json(colegiado);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/revisor/:id/rechazar
router.post("/:id/rechazar", async (req, res, next) => {
  try {
    await prisma.postulacion.update({
      where: { id: Number(req.params.id) },
      data: { estado: "RECHAZADO" },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export { router as revisorRoutes };
