import cors from "cors";
import express from "express";
import { crearRouterModuloPendiente } from "./modules/crearRouterModuloPendiente.js";
import authRoutes from "./modules/auth/routes/authRoutes.js";
import desarrolloHumanoRoutes from "./modules/desarrollo-humano/routes/desarrolloHumanoRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/desarrollo-humano", desarrolloHumanoRoutes);
app.use(
  "/api/v1/permanencia-estudiantil",
  crearRouterModuloPendiente("Permanencia estudiantil"),
);
app.use("/api/v1/salud-integral", crearRouterModuloPendiente("Salud integral"));
app.use("/api/v1/deporte", crearRouterModuloPendiente("Deporte"));
app.use("/api/v1/cultura", crearRouterModuloPendiente("Cultura"));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
