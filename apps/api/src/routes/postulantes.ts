import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middlewares/validate";
import { consultarDNI } from "../services/reniec";

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/postulantes/dni/:dni
router.get("/dni/:dni", async (req, res, next) => {
  try {
    const datos = await consultarDNI(req.params.dni);
    res.json(datos);
  } catch {
    next({ status: 404, message: "DNI no encontrado en RENIEC" });
  }
});

const postulacionSchema = z.object({
  dni: z.string().length(8),
  nombres: z.string().min(2),
  apellidoPaterno: z.string().min(2),
  apellidoMaterno: z.string().min(2),
  gmail: z.string().email(),
  regionId: z.number().int().positive(),
  carreraId: z.number().int().positive(),
  fotoUrl: z.string().url().optional(),
  tituloUrl: z.string().url().optional(),
  voucherUrl: z.string().url().optional(),
});

// POST /api/v1/postulantes
router.post("/", validate(postulacionSchema), async (req, res, next) => {
  try {
    const postulacion = await prisma.postulacion.create({ data: req.body });
    res.status(201).json(postulacion);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/postulantes/:id
router.get("/:id", async (req, res, next) => {
  try {
    const postulacion = await prisma.postulacion.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: { region: true, carrera: true, observaciones: true },
    });
    res.json(postulacion);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/postulantes/:id — subsanación de archivos
router.patch("/:id", async (req, res, next) => {
  try {
    const { fotoUrl, tituloUrl, voucherUrl } = req.body;
    const postulacion = await prisma.postulacion.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(fotoUrl && { fotoUrl }),
        ...(tituloUrl && { tituloUrl }),
        ...(voucherUrl && { voucherUrl }),
        estado: "SUBSANADO",
      },
    });
    res.json(postulacion);
  } catch (err) {
    next(err);
  }
});

export { router as postulanteRoutes };
