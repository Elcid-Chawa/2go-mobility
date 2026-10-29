import mongoose from "mongoose";
import { env } from "./env";
import { RentalAgencyModel } from "../models/agency.model";
import { RentalAuditModel } from "../models/audit.model";
import { RentalBookingModel } from "../models/booking.model";
import { RentalDriverModel } from "../models/driver.model";
import { RentalLicenseModel } from "../models/license.model";
import { RentalRateModel } from "../models/rate.model";
import { RentalVehicleModel } from "../models/vehicle.model";

export const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== "production",
  });
  await Promise.all([
    RentalAgencyModel.createIndexes(),
    RentalAuditModel.createIndexes(),
    RentalBookingModel.createIndexes(),
    RentalDriverModel.createIndexes(),
    RentalLicenseModel.createIndexes(),
    RentalRateModel.createIndexes(),
    RentalVehicleModel.createIndexes(),
  ]);
  console.info(`Car rentals database connected: ${mongoose.connection.host}`);
};
