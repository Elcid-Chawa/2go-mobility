import mongoose from "mongoose";
import { env } from "./env";
import { MoverAgencyModel } from "../models/agency.model";
import { MoverQuoteModel, MoverRequestModel } from "../models/move.model";
import { MoverVehicleModel } from "../models/vehicle.model";

export const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== "production",
  });
  await Promise.all([
    MoverAgencyModel.createIndexes(),
    MoverVehicleModel.createIndexes(),
    MoverRequestModel.createIndexes(),
    MoverQuoteModel.createIndexes(),
  ]);
  console.info(`Movers database connected: ${mongoose.connection.host}`);
};
