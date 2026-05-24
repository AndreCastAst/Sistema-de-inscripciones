import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

interface AppError {
  status?: number;
  message?: string;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Datos inválidos", detalles: err.flatten() });
  }

  // Error con código NOT_FOUND de Prisma
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: string }).code === "P2025"
  ) {
    return res.status(404).json({ error: "Recurso no encontrado" });
  }

  // Errores con status HTTP personalizado
  const appErr = err as AppError;
  if (appErr?.status) {
    return res.status(appErr.status).json({ error: appErr.message ?? "Error" });
  }

  console.error(err);
  return res.status(500).json({ error: "Error interno del servidor" });
}
