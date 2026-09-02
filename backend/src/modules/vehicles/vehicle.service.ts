import { Vehicle, IVehicle } from './vehicle.model';
import { Driver } from '../drivers/driver.model';
import { VehicleCategory, VehicleStatus } from '../../constants/vehicleCategory';

export class VehicleService {
  static async createVehicle(data: {
    driverId?: string;
    registrationNumber: string;
    make: string;
    model: string;
    year: number;
    color: string;
    category?: VehicleCategory;
  }): Promise<IVehicle> {
    const vehicle = await Vehicle.create(data);

    if (data.driverId) {
      await Driver.findByIdAndUpdate(data.driverId, { activeVehicleId: vehicle._id });
    }

    return vehicle;
  }

  static async getVehicles(): Promise<IVehicle[]> {
    return Vehicle.find().populate('driverId');
  }

  static async getVehicleById(id: string): Promise<IVehicle> {
    const vehicle = await Vehicle.findById(id).populate('driverId');
    if (!vehicle) {
      throw { statusCode: 404, message: 'Vehicle not found' };
    }
    return vehicle;
  }
}
