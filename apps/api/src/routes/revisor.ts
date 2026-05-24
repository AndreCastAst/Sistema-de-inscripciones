import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middlewares/validate";
import { generarCodigo } from "../services/correlativo";
import { enviarObservacion, enviarAprobacion } from "../services/email";

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/revisor/bandeja?regionId=1&estado=PENDIENTE
router.get("/bandeja", async (req, res, next) => {
  try {
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined;
    const estado = (req.query.estado as string | undefined) ?? undefined;

    const postulaciones = await prisma.postulacion.findMany({
      where: {
        estado: estado
          ? (estado as any)
          : { in: ["PENDIENTE", "EN_REVISION", "SUBSANADO"] },
        ...(regionId && { regionId }),
      },
      include: {
        region: true,
        carrera: true,
        observaciones: { orderBy: { creadoEn: "desc" }, take: 1 },
      },
      orderBy: { creadoEn: "asc" },
    });
    res.json(postulaciones);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/revisor/:id — ver expediente completo
router.get("/:id", async (req, res, next) => {
  try {
    const postulacion = await prisma.postulacion.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: {
        region: true,
        carrera: true,
        observaciones: { include: { revisor: true }, orderBy: { creadoEn: "desc" } },
      },
    });
    res.json(postulacion);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/revisor/:id/iniciar — marcar como EN_REVISION
router.post("/:id/iniciar", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const actual = await prisma.postulacion.findUniqueOrThrow({ where: { id } });

    if (!["PENDIENTE", "SUBSANADO"].includes(actual.estado)) {
      return res.status(400).json({ error: "Solo se puede iniciar revisión de postulaciones PENDIENTE o SUBSANADO" });
    }

    const postulacion = await prisma.postulacion.update({
      where: { id },
      data: { estado: "EN_REVISION" },
    });

    await prisma.auditoria.create({
      data: { accion: "INICIO_REVISION", entidad: "Postulacion", entidadId: id, actorId: req.body.revisorId },
    });

    res.json(postulacion);
  } catch (err) {
    next(err);
  }
});

const observarSchema = z.object({
  mensaje: z.string().min(10, "La observación debe tener al menos 10 caracteres"),
  revisorId: z.number().int().positive(),
});

// POST /api/v1/revisor/:id/observar
router.post("/:id/observar", validate(observarSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const postulacion = await prisma.postulacion.findUniqueOrThrow({ where: { id } });

    const obs = await prisma.observacion.create({
      data: {
        postulacionId: id,
        mensaje: req.body.mensaje,
        revisorId: req.body.revisorId,
      },
    });

    await prisma.postulacion.update({
      where: { id },
      data: { estado: "OBSERVADO" },
    });

    await prisma.auditoria.create({
      data: {
        accion: "OBSERVACION",
        entidad: "Postulacion",
        entidadId: id,
        actorId: req.body.revisorId,
        detalle: req.body.mensaje.substring(0, 100),
      },
    });

    // Notificar al postulante por correo
    await enviarObservacion(postulacion.gmail, req.body.mensaje, id).catch(console.error);

    res.json(obs);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/revisor/:id/aprobar
router.post("/:id/aprobar", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const postulacion = await prisma.postulacion.findUniqueOrThrow({ where: { id } });

    if (!["PENDIENTE", "EN_REVISION", "SUBSANADO"].includes(postulacion.estado)) {
      return res.status(400).json({ error: "No se puede aprobar una postulación en estado " + postulacion.estado });
    }

    // Verificar que no esté ya colegiado
    const yaExiste = await prisma.colegiado.findUnique({ where: { dni: postulacion.dni } });
    if (yaExiste) {
      return res.status(409).json({ error: "El postulante ya tiene una colegiatura activa" });
    }

    const codigo = await generarCodigo(postulacion.regionId, postulacion.carreraId);

    const colegiado = await prisma.colegiado.create({
      data: {
        codigo,
        dni: postulacion.dni,
        nombres: postulacion.nombres,
        apellidoPaterno: postulacion.apellidoPaterno,
        apellidoMaterno: postulacion.apellidoMaterno,
        gmail: postulacion.gmail,
        postulacionId: id,
        regionId: postulacion.regionId,
        carreraId: postulacion.carreraId,
        fotoUrl: postulacion.fotoUrl ?? undefined,
      },
    });

    await prisma.postulacion.update({
      where: { id },
      data: { estado: "APROBADO" },
    });

    await prisma.auditoria.create({
      data: {
        accion: "APROBACION",
        entidad: "Postulacion",
        entidadId: id,
        actorId: req.body.revisorId,
        detalle: `Código generado: ${codigo}`,
      },
    });

    const nombreCompleto = `${colegiado.nombres} ${colegiado.apellidoPaterno}`;
    await enviarAprobacion(postulacion.gmail, codigo, nombreCompleto).catch(console.error);

    res.status(201).json(colegiado);
  } catch (err) {
    next(err);
  }
});

const rechazarSchema = z.object({
  motivo: z.string().min(10, "El motivo debe tener al menos 10 caracteres"),
  revisorId: z.number().int().positive(),
});

// POST /api/v1/revisor/:id/rechazar
router.post("/:id/rechazar", validate(rechazarSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.postulacion.update({
      where: { id },
      data: { estado: "RECHAZADO" },
    });

    await prisma.auditoria.create({
      data: {
        accion: "RECHAZO",
        entidad: "Postulacion",
        entidadId: id,
        actorId: req.body.revisorId,
        detalle: req.body.motivo,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export { router as revisorRoutes };
