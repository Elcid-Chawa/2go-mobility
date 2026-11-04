import express, { ErrorRequestHandler } from "express";
import helmet from "helmet";
import { authenticateDeliveryUser } from "./auth";
import { env } from "./config/env";
import { healthHandler } from "./routes/service.routes";
import serviceRoutes from "./routes/service.routes";

export const createApp = (): express.Express => {
  const app = express();
  app.use(helmet());
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (env.CORS_ALLOW_ALL) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
      res.setHeader("Access-Control-Max-Age", "86400");
    } else if (origin && env.CORS_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
      res.setHeader("Access-Control-Max-Age", "86400");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", healthHandler);
  app.get("/api/v1/delivery/health", healthHandler);
  app.use("/api/v1/delivery", authenticateDeliveryUser, serviceRoutes);
  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Endpoint not found: ${req.method} ${req.originalUrl}` });
  });
  const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error instanceof SyntaxError && "body" in error) {
      res.status(400).json({ success: false, message: "Request body must contain valid JSON." });
      return;
    }
    console.error("Unhandled delivery-service request error", error);
    res.status(500).json({ success: false, message: "The delivery request could not be completed." });
  };
  app.use(errorHandler);
  return app;
};
