import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middlewares/validate";

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/subsanacion/:token — obtener expediente por token
router.get("/:token", async (req, res, next) => {
  try {
    const postulacion = await prisma.postulacion.findUnique({
      where: { subsanacionToken: req.params.token },
      include: {
        region: true,
        carrera: true,
        observaciones: { orderBy: { creadoEn: "desc" }, take: 1 },
      },
    });

    if (!postulacion) {
      return res.status(404).json({ error: "Enlace de subsanación no válido" });
    }
    if (postulacion.tokenExpiracion && new Date() > postulacion.tokenExpiracion) {
      return res.status(410).json({ error: "El enlace de subsanación ha expirado. Usa tu DNI para acceder." });
    }
    if (postulacion.estado !== "OBSERVADO") {
      return res.status(400).json({ error: "Este expediente no requiere subsanación en este momento." });
    }

    res.json(postulacion);
  } catch (err) {
    next(err);
  }
});

const subsanacionSchema = z.object({
  fotoUrl: z.string().url().optional(),
  tituloUrl: z.string().url().optional(),
  voucherUrl: z.string().url().optional(),
}).refine((d) => d.fotoUrl || d.tituloUrl || d.voucherUrl, {
  message: "Debes corregir al menos un campo",
});

// PATCH /api/v1/subsanacion/:token — enviar subsanación
router.patch("/:token", validate(subsanacionSchema), async (req, res, next) => {
  try {
    const postulacion = await prisma.postulacion.findUnique({
      where: { subsanacionToken: req.params.token },
    });

    if (!postulacion) {
      return res.status(404).json({ error: "Enlace de subsanación no válido" });
    }
    if (postulacion.tokenExpiracion && new Date() > postulacion.tokenExpiracion) {
      return res.status(410).json({ error: "El enlace de subsanación ha expirado." });
    }
    if (postulacion.estado !== "OBSERVADO") {
      return res.status(400).json({ error: "Este expediente no puede ser subsanado en su estado actual." });
    }

    const { fotoUrl, tituloUrl, voucherUrl } = req.body;
    const campos = [fotoUrl && "foto", tituloUrl && "titulo", voucherUrl && "voucher"].filter(Boolean);

    const updated = await prisma.postulacion.update({
      where: { id: postulacion.id },
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
        entidadId: postulacion.id,
        detalle: `Campos corregidos: ${campos.join(", ")}`,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export { router as subsanacionRoutes };
