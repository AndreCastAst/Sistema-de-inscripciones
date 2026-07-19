import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? "cip_secret_dev";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Usuario y contraseña requeridos" });
    return;
  }

  const { username, password } = parsed.data;
  const usuario = await prisma.usuario.findUnique({ where: { username }, include: { region: true } });
  if (!usuario) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  const ok = await bcrypt.compare(password, usuario.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  const token = jwt.sign(
    {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      rol: usuario.rol,
      regionId: usuario.regionId,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    token,
    nombre: usuario.nombre,
    rol: usuario.rol,
    regionId: usuario.regionId,
    regionNombre: usuario.region?.nombre ?? null,
  });
});

export { router as authRoutes };
