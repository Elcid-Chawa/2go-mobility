import { MoverVehicleType } from "./models/vehicle.model";

export interface MoveRequirements {
  preferredVehicleType?: MoverVehicleType | null;
  estimatedVolumeM3: number;
  crewRequired: number;
}

export interface MovingVehicleCapacity {
  vehicleType: MoverVehicleType;
  volumeM3: number;
  crewCapacity: number;
}

export function vehicleFitsMove(vehicle: MovingVehicleCapacity, move: MoveRequirements): boolean {
  return (
    (!move.preferredVehicleType || vehicle.vehicleType === move.preferredVehicleType) &&
    vehicle.volumeM3 >= move.estimatedVolumeM3 &&
    vehicle.crewCapacity >= move.crewRequired
  );
}

export function moveEndAt(startAt: Date, durationHours: number): Date {
  return new Date(startAt.getTime() + durationHours * 60 * 60 * 1000);
}
