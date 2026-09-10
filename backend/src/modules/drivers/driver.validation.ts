import { z } from "zod";
import { VehicleCategory } from "../../constants/vehicleCategory";

export const nearbyDriversSchema = z.object({
  query: z.object({
    longitude: z.coerce.number().min(-180).max(180),
    latitude: z.coerce.number().min(-90).max(90),
    radiusKm: z.coerce.number().positive().max(50).optional().default(10),
    category: z.nativeEnum(VehicleCategory).optional(),
  }),
});
