import mongoose from "mongoose";
import { env } from "./env";
import { DeliveryOrderModel, DeliveryPricingModel } from "../models/delivery.model";

export const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== "production",
  });
  await Promise.all([
    DeliveryOrderModel.createIndexes(),
    DeliveryPricingModel.createIndexes(),
  ]);
  console.info(`Delivery database connected: ${mongoose.connection.host}`);
};
