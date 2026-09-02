import { Trip } from "../trips/trip.model";
import { Driver } from "../drivers/driver.model";
import { Customer } from "../customers/customer.model";
import { Vehicle } from "../vehicles/vehicle.model";
import { Payment } from "../payments/payment.model";
import { TripStatus, DriverOnlineStatus } from "../../constants/tripStatus";

export class AdminService {
  static async getDashboardKPIs(): Promise<any> {
    const totalTrips = await Trip.countDocuments();
    const activeTrips = await Trip.countDocuments({
      status: {
        $in: [
          TripStatus.REQUESTED,
          TripStatus.SEARCHING_DRIVER,
          TripStatus.DRIVER_ASSIGNED,
          TripStatus.DRIVER_ACCEPTED,
          TripStatus.DRIVER_ARRIVED,
          TripStatus.TRIP_STARTED,
        ],
      },
    });
    const completedTrips = await Trip.countDocuments({
      status: TripStatus.PAID,
    });
    const onlineDrivers = await Driver.countDocuments({
      onlineStatus: DriverOnlineStatus.ONLINE,
    });
    const totalDrivers = await Driver.countDocuments();
    const totalCustomers = await Customer.countDocuments();
    const totalVehicles = await Vehicle.countDocuments();

    // Total gross revenue
    const revenueAgg = await Payment.aggregate([
      { $match: { status: "PAID" } },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    return {
      totalTrips,
      activeTrips,
      completedTrips,
      onlineDrivers,
      totalDrivers,
      totalCustomers,
      totalVehicles,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      currency: "RWF",
    };
  }

  static async getTrips(query: any = {}): Promise<any[]> {
    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }
    return Trip.find(filter)
      .populate({
        path: "customerId",
        populate: { path: "userId", select: "name email phone" },
      })
      .populate({
        path: "driverId",
        populate: { path: "userId", select: "name email phone" },
      })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  static async getDrivers(): Promise<any[]> {
    return Driver.find()
      .populate("userId", "name email phone status")
      .populate("activeVehicleId")
      .sort({ createdAt: -1 });
  }

  static async getVehicles(): Promise<any[]> {
    return Vehicle.find().populate({
      path: "driverId",
      populate: { path: "userId", select: "name phone" },
    });
  }

  static async getCustomers(): Promise<any[]> {
    return Customer.find()
      .populate("userId", "name email phone status")
      .sort({ createdAt: -1 });
  }
}
