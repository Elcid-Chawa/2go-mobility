import { z } from 'zod';
import { VehicleCategory } from '../../constants/vehicleCategory';

export const estimateFareSchema = z.object({
  body: z.object({
    pickup: z.object({
      coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
      address: z.string().optional(),
    }),
    destination: z.object({
      coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
      address: z.string().optional(),
    }),
    category: z.nativeEnum(VehicleCategory).optional(),
    routedDistanceKm: z.number().positive().max(2000).optional(),
  }),
});
