import { Request, Response, Router } from "express";
import mongoose from "mongoose";

const router = Router();

export const healthHandler = (_req: Request, res: Response): void => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    service: "movers",
    status: databaseConnected ? "UP" : "DEGRADED",
    database: databaseConnected ? "CONNECTED" : "DISCONNECTED",
    timestamp: new Date().toISOString(),
  });
};

router.get("/health", healthHandler);

export default router;
