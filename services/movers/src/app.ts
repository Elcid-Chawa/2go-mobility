import express from "express";
import helmet from "helmet";
import { healthHandler } from "./routes/service.routes";
import serviceRoutes from "./routes/service.routes";
import moverRoutes from "./routes/mover.routes";
import { authenticateMoverUser } from "./auth";

export const createApp = (): express.Express => {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", healthHandler);
  app.use("/api/v1/movers", serviceRoutes);
  app.use("/api/v1/movers", authenticateMoverUser, moverRoutes);
  return app;
};
