import { z } from "zod";
import { UserRole, UserStatus } from "../../constants/roles";
import { VehicleCategory, VehicleStatus } from "../../constants/vehicleCategory";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");

export const createManagedUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(7).max(32),
    password: z.string().min(10).max(128),
    role: z.nativeEnum(UserRole),
  }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ status: z.nativeEnum(UserStatus) }),
});

export const createVehicleSchema = z.object({
  body: z.object({
    driverId: objectId.optional(),
    registrationNumber: z.string().trim().min(2).max(32),
    vin: z.string().trim().min(5).max(64),
    make: z.string().trim().min(1).max(64),
    model: z.string().trim().min(1).max(64),
    year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
    color: z.string().trim().min(1).max(32),
    category: z.nativeEnum(VehicleCategory),
    status: z.nativeEnum(VehicleStatus).optional(),
  }),
});

export const updateVehicleStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ status: z.nativeEnum(VehicleStatus) }),
});

export const manualAssignSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ driverId: objectId }),
});
