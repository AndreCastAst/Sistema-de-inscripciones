import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "cip_secret_dev";

export interface AuthPayload {
  id: number;
  username: string;
  nombre: string;
  rol: string;
  regionId: number | null;
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

// Igual que requireAuth pero nunca bloquea: si hay un token válido lo adjunta
// a req.usuario, si no simplemente continúa sin autenticar. Para rutas que
// deben seguir siendo públicas pero aplicar reglas extra cuando sí hay sesión.
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }
  try {
    const token = header.slice(7);
    req.usuario = jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    // token inválido/expirado: se ignora y la request sigue como anónima
  }
  next();
}

export function requireRole(...roles: string[]) {
  return function (req: Request, res: Response, next: NextFunction) {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      res.status(403).json({ error: "No tiene permisos para esta operación" });
      return;
    }
    next();
  };
}
