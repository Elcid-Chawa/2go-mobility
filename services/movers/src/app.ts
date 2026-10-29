import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { healthHandler } from "./routes/service.routes";
import serviceRoutes from "./routes/service.routes";
import moverRoutes from "./routes/mover.routes";
import { authenticateMoverUser } from "./auth";

export const createApp = (): express.Express => {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && env.CORS_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, OPTIONS",
      );
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.get("/health", healthHandler);
  app.use("/api/v1/movers", serviceRoutes);
  app.use("/api/v1/movers", authenticateMoverUser, moverRoutes);
  return app;
};
