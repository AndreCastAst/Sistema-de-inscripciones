import express from "express";
import cors from "cors";
import { postulanteRoutes } from "./routes/postulantes";
import { revisorRoutes } from "./routes/revisor";
import { pagosRoutes } from "./routes/pagos";
import { carnetRoutes } from "./routes/carnet";
import { catalogoRoutes } from "./routes/catalogos";
import { colegiadoRoutes } from "./routes/colegiado";
import { authRoutes } from "./routes/auth";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();
const PORT = process.env.PORT ?? 4000;

const corsOrigin = process.env.CORS_ORIGIN ?? "*";
const corsOptions =
  corsOrigin === "*"
    ? { origin: "*" as const }
    : { origin: corsOrigin.split(",").map((o) => o.trim()) };
app.use(cors(corsOptions));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/postulantes", postulanteRoutes);
app.use("/api/v1/revisor", revisorRoutes);
app.use("/api/v1/pagos", pagosRoutes);
app.use("/api/v1/carnet", carnetRoutes);
app.use("/api/v1/colegiado", colegiadoRoutes);
app.use("/api/v1", catalogoRoutes);

app.use(errorHandler);

app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`));
