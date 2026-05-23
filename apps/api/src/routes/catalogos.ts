import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/regiones", async (_req, res, next) => {
  try {
    const regiones = await prisma.region.findMany({ orderBy: { nombre: "asc" } });
    res.json(regiones);
  } catch (err) {
    next(err);
  }
});

router.get("/carreras", async (_req, res, next) => {
  try {
    const carreras = await prisma.carrera.findMany({ orderBy: { nombre: "asc" } });
    res.json(carreras);
  } catch (err) {
    next(err);
  }
});

export { router as catalogoRoutes };
