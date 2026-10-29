import { Request, Response, Router } from "express";
import mongoose from "mongoose";
import rentalRoutes from "./rental.routes";

const router = Router();

export const healthHandler = (_req: Request, res: Response): void => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    service: "car-rentals",
    status: databaseConnected ? "UP" : "DEGRADED",
    database: databaseConnected ? "CONNECTED" : "DISCONNECTED",
    timestamp: new Date().toISOString(),
  });
};

router.get("/health", healthHandler);
router.use("/", rentalRoutes);

export default router;
