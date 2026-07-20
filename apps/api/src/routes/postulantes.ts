import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middlewares/validate";
import { consultarDNI } from "../services/reniec";
import { firmarUrl } from "../services/cloudinary";
import { enviarConfirmacionInscripcion } from "../services/email";
import { generarBoletaPDF } from "../services/pdf";

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

    // Enviar confirmación por email con PDF adjunto (no-blocking)
    (async () => {
      try {
        let pdfBuffer: Buffer | undefined;
        const vu = postulacion.voucherUrl;
        if (vu?.startsWith("SIM-")) {
          const parts = vu.split("-");
          if (parts.length >= 4) {
            const banco = parts[1];
            const numOp = `${parts[1]}-${parts[2]}`;
            const codigoVoucher = parts[3];
            pdfBuffer = await generarBoletaPDF({
              nombreCompleto: `${postulacion.apellidoPaterno} ${postulacion.apellidoMaterno}, ${postulacion.nombres}`,
              dni: postulacion.dni,
              monto: 3,
              banco,
              numOp,
              codigoVoucher,
              numeroBoleta: String(Math.floor(1000000 + Math.random() * 9000000)).padStart(8, "0"),
              fecha: new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }),
              hora: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
            });
          }
        }
        await enviarConfirmacionInscripcion(postulacion.gmail, {
          postulacionId: postulacion.id,
          nombres: postulacion.nombres,
          apellidoPaterno: postulacion.apellidoPaterno,
          apellidoMaterno: postulacion.apellidoMaterno,
          dni: postulacion.dni,
          voucherUrl: postulacion.voucherUrl ?? undefined,
          pdfBuffer,
        });
      } catch (err: any) {
        console.error(`[Email] Error al enviar confirmación a ${postulacion.gmail}:`, err?.message ?? err);
      }
    })();

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

    // El postulante solo puede reemplazar los documentos que el revisor marcó
    // en la última observación. La UI ya los oculta, pero la restricción tiene
    // que vivir acá: el PATCH es público y se puede llamar directo.
    const ultima = await prisma.observacion.findFirst({
      where: { postulacionId: id },
      orderBy: { creadoEn: "desc" },
    });
    // Observaciones anteriores a esta función no tienen campos marcados; en ese
    // caso se permite corregir todo para no bloquear expedientes ya notificados.
    const permitidos = ultima?.campos.length ? ultima.campos : ["foto", "titulo", "voucher"];

    const { fotoUrl, tituloUrl, voucherUrl } = req.body;
    const enviados = [
      ...(fotoUrl ? ["foto"] : []),
      ...(tituloUrl ? ["titulo"] : []),
      ...(voucherUrl ? ["voucher"] : []),
    ];
    const noPermitidos = enviados.filter((c) => !permitidos.includes(c));
    if (noPermitidos.length) {
      const ETIQUETA: Record<string, string> = {
        foto: "fotografía",
        titulo: "título profesional",
        voucher: "comprobante de pago",
      };
      return res.status(400).json({
        error: `Solo puedes corregir los documentos observados. No corresponde modificar: ${noPermitidos
          .map((c) => ETIQUETA[c] ?? c)
          .join(", ")}.`,
      });
    }

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
