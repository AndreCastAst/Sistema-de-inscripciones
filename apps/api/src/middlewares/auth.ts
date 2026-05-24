import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "cip_secret_dev";

export interface AuthPayload {
  id: number;
  username: string;
  nombre: string;
  rol: string;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.usuario = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}
