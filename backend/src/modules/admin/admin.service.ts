import { Trip } from "../trips/trip.model";
import { Driver } from "../drivers/driver.model";
import { Customer } from "../customers/customer.model";
import { Vehicle } from "../vehicles/vehicle.model";
import { Payment } from "../payments/payment.model";
import { TripStatus, DriverOnlineStatus } from "../../constants/tripStatus";
import { User, IUser } from "../users/user.model";
import { UserRole, UserStatus } from "../../constants/roles";
import { DriverApprovalStatus, DriverOnlineStatus as OnlineStatus } from "../../constants/tripStatus";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

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

  static async getUsers(): Promise<Pick<IUser, "_id" | "name" | "email" | "phone" | "role" | "status" | "createdAt">[]> {
    return User.find()
      .select("_id name email phone role status createdAt")
      .sort({ createdAt: -1 })
      .limit(200);
  }

  static async createUser(
    data: { name: string; email: string; phone: string; password: string; role: UserRole },
    actorRole: UserRole,
  ): Promise<IUser> {
    const staffRoles = [
      UserRole.ADMIN,
      UserRole.OPERATIONS,
      UserRole.AGENT,
      UserRole.DISPATCHER,
      UserRole.VIEWER,
      UserRole.SYSTEM_OWNER,
    ];
    if (staffRoles.includes(data.role) && ![UserRole.ADMIN, UserRole.SYSTEM_OWNER].includes(actorRole)) {
      throw { statusCode: 403, message: "Only administrators can create Operations staff." };
    }
    if (data.role === UserRole.SYSTEM_OWNER && actorRole !== UserRole.SYSTEM_OWNER) {
      throw { statusCode: 403, message: "Only a system owner can create another system owner." };
    }

    const email = data.email.toLowerCase();
    if (await User.exists({ $or: [{ email }, { phone: data.phone }] })) {
      throw { statusCode: 409, message: "Email or phone number is already registered." };
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      name: data.name,
      email,
      phone: data.phone,
      passwordHash,
      role: data.role,
      status: UserStatus.ACTIVE,
    });
    if (data.role === UserRole.CUSTOMER) {
      await Customer.create({ userId: user._id });
    } else if (data.role === UserRole.DRIVER) {
      await Driver.create({
        userId: user._id,
        licenseNumber: `PENDING-${user._id.toString().slice(-8).toUpperCase()}`,
        approvalStatus: DriverApprovalStatus.PENDING,
      });
    }
    return user;
  }

  static async updateUserStatus(id: string, status: UserStatus): Promise<IUser> {
    const update: Record<string, unknown> = { $set: { status } };
    if (status !== UserStatus.ACTIVE) update.$unset = { refreshToken: 1 };
    const user = await User.findByIdAndUpdate(id, update, { new: true })
      .select("_id name email phone role status createdAt");
    if (!user) throw { statusCode: 404, message: "User not found." };
    if (user.role === UserRole.DRIVER && status !== UserStatus.ACTIVE) {
      await Driver.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(id) },
        { $set: { onlineStatus: OnlineStatus.OFFLINE } },
      );
    }
    return user;
  }

  static async updateVehicleStatus(id: string, status: string): Promise<any> {
    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true },
    );
    if (!vehicle) throw { statusCode: 404, message: "Vehicle not found." };
    if (status !== "ACTIVE" && vehicle.driverId) {
      await Driver.findByIdAndUpdate(vehicle.driverId, {
        $set: { onlineStatus: OnlineStatus.OFFLINE },
        $unset: { activeVehicleId: 1 },
      });
    } else if (status === "ACTIVE" && vehicle.driverId) {
      await Driver.findByIdAndUpdate(vehicle.driverId, {
        $set: { activeVehicleId: vehicle._id },
      });
    }
    return vehicle;
  }
}
