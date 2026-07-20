import { Router, Request } from "express";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { z } from "zod";
import { validate } from "../middlewares/validate";
import { requireAuth, requireRole } from "../middlewares/auth";
import { generarCodigo } from "../services/correlativo";
import { enviarObservacion, enviarAprobacion, enviarRedireccionSede } from "../services/email";
import { firmarUrl } from "../services/cloudinary";

const router = Router();
const prisma = new PrismaClient();

// Todas las rutas del revisor requieren autenticación JWT y rol admin
router.use(requireAuth, requireRole("admin"));

// Filtro de sede: el super-admin (regionId null) ve todas las sedes,
// un admin de sede solo ve/opera sobre su propia región.
function regionWhere(req: Request): { regionId?: number } {
  return req.usuario!.regionId === null ? {} : { regionId: req.usuario!.regionId };
}

function fueraDeSede(req: Request, regionId: number): boolean {
  return req.usuario!.regionId !== null && regionId !== req.usuario!.regionId;
}

// Desde que la inscripción se cobra con MercadoPago, el expediente se crea
// antes de pagar: quien abandona el checkout deja una solicitud sin pago que no
// debe llegar a la bandeja. La regla aplica solo hacia adelante — los 17
// expedientes anteriores sin referencia de pago se siguen viendo, porque son
// trabajo real ya en curso y ocultarlos los perdería de vista.
const INICIO_REGLA_PAGO = new Date("2026-07-20T17:00:00.000Z");

// Visible si ya tiene pago registrado, o si es anterior a la regla.
const filtroPagado = {
  OR: [{ voucherUrl: { not: null } }, { creadoEn: { lt: INICIO_REGLA_PAGO } }],
};

// GET /api/v1/revisor/bandeja?page=1&search=xxx&estado=PENDIENTE
router.get("/bandeja", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string | undefined)?.trim();

    // Un expediente aprobado ya cumplió su ciclo: se convirtió en colegiado y a
    // partir de ahí se le cobran cuotas, no se le audita. Sale de la bandeja
    // para que el revisor solo vea lo que tiene pendiente de resolver.
    const ESTADOS = ["PENDIENTE", "EN_REVISION", "OBSERVADO", "SUBSANADO", "RECHAZADO"];
    const estadoParam = (req.query.estado as string | undefined)?.trim();
    // Aunque se pida APROBADO explícitamente en el filtro, no se devuelve.
    const estado = estadoParam && ESTADOS.includes(estadoParam) ? estadoParam : undefined;

    // Rango de fechas por fecha de ingreso (creadoEn)
    const fechaDesde = (req.query.fechaDesde as string | undefined)?.trim();
    const fechaHasta = (req.query.fechaHasta as string | undefined)?.trim();
    const creadoEn: { gte?: Date; lte?: Date } = {};
    if (fechaDesde) {
      const d = new Date(`${fechaDesde}T00:00:00`);
      if (!isNaN(d.getTime())) creadoEn.gte = d;
    }
    if (fechaHasta) {
      const d = new Date(`${fechaHasta}T23:59:59.999`);
      if (!isNaN(d.getTime())) creadoEn.lte = d;
    }

    const where: any = {
      ...regionWhere(req),
      ...(estado ? { estado } : { estado: { in: ESTADOS } }),
      ...(creadoEn.gte || creadoEn.lte ? { creadoEn } : {}),
      // Se combinan con AND porque la búsqueda también usa OR y uno pisaría al otro.
      AND: [
        filtroPagado,
        ...(search
          ? [
              {
                OR: [
                  { dni: { contains: search, mode: "insensitive" } },
                  { nombres: { contains: search, mode: "insensitive" } },
                  { apellidoPaterno: { contains: search, mode: "insensitive" } },
                  { apellidoMaterno: { contains: search, mode: "insensitive" } },
                ],
              },
            ]
          : []),
      ],
    };

    const [total, postulaciones] = await Promise.all([
      prisma.postulacion.count({ where }),
      prisma.postulacion.findMany({
        where,
        include: { region: true, carrera: true },
        orderBy: { creadoEn: "desc" },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: postulaciones,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
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
    if (fueraDeSede(req, postulacion.regionId)) {
      return res.status(403).json({ error: "No tiene acceso a expedientes de otra sede" });
    }
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

    if (fueraDeSede(req, actual.regionId)) {
      return res.status(403).json({ error: "No tiene acceso a expedientes de otra sede" });
    }

    if (!["PENDIENTE", "SUBSANADO"].includes(actual.estado)) {
      return res.status(400).json({ error: "Solo se puede iniciar revisión de postulaciones PENDIENTE o SUBSANADO" });
    }

    const postulacion = await prisma.postulacion.update({
      where: { id },
      data: { estado: "EN_REVISION" },
    });

    await prisma.auditoria.create({
      data: { accion: "INICIO_REVISION", entidad: "Postulacion", entidadId: id, actorId: req.usuario!.id },
    });

    res.json(postulacion);
  } catch (err) {
    next(err);
  }
});

export const CAMPOS_SUBSANABLES = ["foto", "titulo", "voucher"] as const;

const observarSchema = z.object({
  mensaje: z.string().min(10, "La observación debe tener al menos 10 caracteres"),
  revisorId: z.number().int().positive(),
  // Documentos que el postulante podrá reemplazar al subsanar. Se exige al
  // menos uno: una observación sin campos dejaría el expediente sin nada
  // corregible y el postulante no podría avanzar.
  campos: z
    .array(z.enum(CAMPOS_SUBSANABLES))
    .min(1, "Marca al menos un documento como observado")
    .transform((c) => Array.from(new Set(c))),
});

// POST /api/v1/revisor/:id/observar
router.post("/:id/observar", validate(observarSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const postulacion = await prisma.postulacion.findUniqueOrThrow({ where: { id } });

    if (fueraDeSede(req, postulacion.regionId)) {
      return res.status(403).json({ error: "No tiene acceso a expedientes de otra sede" });
    }

    const obs = await prisma.observacion.create({
      data: {
        postulacionId: id,
        mensaje: req.body.mensaje,
        campos: req.body.campos,
        revisorId: req.body.revisorId,
      },
    });

    // Token de un solo uso: el correo lleva al postulante directo a su
    // expediente, sin pedirle el DNI. Se renueva en cada observación para que
    // un enlace viejo no sirva después de subsanar.
    const token = randomBytes(32).toString("hex");

    await prisma.postulacion.update({
      where: { id },
      data: { estado: "OBSERVADO", tokenSubsanacion: token },
    });

    await prisma.auditoria.create({
      data: {
        accion: "OBSERVACION",
        entidad: "Postulacion",
        entidadId: id,
        actorId: req.usuario!.id,
        detalle: req.body.mensaje.substring(0, 100),
      },
    });

    // Notificar al postulante por correo, indicando qué debe corregir
    await enviarObservacion(
      postulacion.gmail,
      req.body.mensaje,
      id,
      req.body.campos,
      `${process.env.FRONTEND_URL}/subsanacion/${token}`
    ).catch(console.error);

    res.json(obs);
  } catch (err) {
    next(err);
  }
});

const redirigirSchema = z.object({
  regionId: z.number().int().positive(),
  motivo: z.string().trim().max(200).optional(),
});

// POST /api/v1/revisor/:id/redirigir — mover el expediente a otra sede
// (el postulante se equivocó de sede al inscribirse en el portal público)
router.post("/:id/redirigir", validate(redirigirSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { regionId, motivo } = req.body as { regionId: number; motivo?: string };

    const postulacion = await prisma.postulacion.findUniqueOrThrow({
      where: { id },
      include: { region: true },
    });

    if (fueraDeSede(req, postulacion.regionId)) {
      return res.status(403).json({ error: "No tiene acceso a expedientes de otra sede" });
    }

    // Un expediente ya decidido no se mueve: el código CIP se emite con la sede
    // que tenía al aprobarse y cambiarla dejaría el correlativo inconsistente.
    if (["APROBADO", "RECHAZADO"].includes(postulacion.estado)) {
      return res
        .status(400)
        .json({ error: "No se puede redirigir un expediente en estado " + postulacion.estado });
    }

    if (regionId === postulacion.regionId) {
      return res.status(400).json({ error: "El expediente ya pertenece a esa sede" });
    }

    const destino = await prisma.region.findUnique({ where: { id: regionId } });
    if (!destino) {
      return res.status(400).json({ error: "La sede de destino no existe" });
    }

    const actualizada = await prisma.postulacion.update({
      where: { id },
      data: { regionId },
      // Mismo shape que GET /:id para que el frontend pueda reemplazar el
      // expediente en pantalla sin perder el historial de observaciones.
      include: {
        region: true,
        carrera: true,
        observaciones: { include: { revisor: true }, orderBy: { creadoEn: "desc" } },
      },
    });

    await prisma.auditoria.create({
      data: {
        accion: "REDIRECCION_SEDE",
        entidad: "Postulacion",
        entidadId: id,
        actorId: req.usuario!.id,
        detalle: `${postulacion.region.nombre} → ${destino.nombre}${motivo ? `. Motivo: ${motivo}` : ""}`,
      },
    });

    // Notificar al postulante del cambio de sede
    await enviarRedireccionSede(postulacion.gmail, {
      postulacionId: id,
      nombres: `${postulacion.apellidoPaterno} ${postulacion.apellidoMaterno}, ${postulacion.nombres}`,
      sedeAnterior: postulacion.region.nombre,
      sedeNueva: destino.nombre,
      motivo,
    }).catch(console.error);

    res.json(actualizada);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/revisor/:id/aprobar
router.post("/:id/aprobar", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    // La especialidad puede venir como texto escrito por el admin (carreraNombre)
    // o como id del catálogo (carreraId). Si viene texto, se busca-o-crea la carrera.
    const carreraNombreRaw =
      typeof req.body.carreraNombre === "string" ? req.body.carreraNombre.trim() : "";
    let carreraId = Number(req.body.carreraId) || 0;

    if (carreraNombreRaw) {
      // Normalizar: quitar prefijo "Ing." / "Ing " para no duplicar el catálogo
      const nombre = carreraNombreRaw.replace(/^ing\.?\s+/i, "").trim();
      if (!nombre) {
        return res.status(400).json({ error: "La especialidad no puede estar vacía" });
      }
      // Reutilizar una carrera existente (sin distinguir mayúsculas) o crear una nueva
      const existente = await prisma.carrera.findFirst({
        where: { nombre: { equals: nombre, mode: "insensitive" } },
      });
      const carrera = existente ?? (await prisma.carrera.create({ data: { nombre } }));
      carreraId = carrera.id;
    }

    if (!carreraId) {
      return res.status(400).json({ error: "Debes indicar una especialidad antes de aprobar" });
    }

    // Fecha de alta opcional (permite fechas pasadas para probar deudas de mensualidades)
    let fechaAlta: Date | undefined;
    if (req.body.fechaAlta) {
      const parsed = new Date(req.body.fechaAlta);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: "Fecha de alta inválida" });
      }
      if (parsed.getTime() > Date.now()) {
        return res.status(400).json({ error: "La fecha de alta no puede ser futura" });
      }
      fechaAlta = parsed;
    }

    const postulacion = await prisma.postulacion.findUniqueOrThrow({ where: { id } });

    if (fueraDeSede(req, postulacion.regionId)) {
      return res.status(403).json({ error: "No tiene acceso a expedientes de otra sede" });
    }

    if (!["PENDIENTE", "EN_REVISION", "SUBSANADO"].includes(postulacion.estado)) {
      return res.status(400).json({ error: "No se puede aprobar una postulación en estado " + postulacion.estado });
    }

    // Verificar que no esté ya colegiado
    const yaExiste = await prisma.colegiado.findUnique({ where: { dni: postulacion.dni } });
    if (yaExiste) {
      return res.status(409).json({ error: "El postulante ya tiene una colegiatura activa" });
    }

    const codigo = await generarCodigo(postulacion.regionId, carreraId);

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
        carreraId,
        fotoUrl: postulacion.fotoUrl ?? undefined,
        fechaAlta,
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
        actorId: req.usuario!.id,
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
    const actual = await prisma.postulacion.findUniqueOrThrow({ where: { id } });

    if (fueraDeSede(req, actual.regionId)) {
      return res.status(403).json({ error: "No tiene acceso a expedientes de otra sede" });
    }

    await prisma.postulacion.update({
      where: { id },
      data: { estado: "RECHAZADO" },
    });

    await prisma.auditoria.create({
      data: {
        accion: "RECHAZO",
        entidad: "Postulacion",
        entidadId: id,
        actorId: req.usuario!.id,
        detalle: req.body.motivo,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export { router as revisorRoutes };
