import mongoose from "mongoose";
import { Onboarding, IOnboarding } from "./driver-onboarding.model";
import { Driver } from "../drivers/driver.model";
import { Vehicle } from "../vehicles/vehicle.model";
import {
  DriverOnboardingStatus,
  DriverVerificationStatus,
} from "../../constants/onboardingStatus";
import { DriverApprovalStatus } from "../../constants/tripStatus";
import {
  VehicleCategory,
  VehicleStatus,
} from "../../constants/vehicleCategory";

export class DriverOnboardingService {
  static async getOrCreateOnboarding(userId: string): Promise<IOnboarding> {
    const driver = await Driver.findOne({ userId }).populate(
      "userId",
      "name email phone",
    );
    if (!driver) {
      throw { statusCode: 404, message: "Driver profile not found" };
    }

    let onboarding = await Onboarding.findOne({
      driverId: driver._id,
    }).populate({
      path: "driverId",
      populate: { path: "userId", select: "name email phone" },
    });

    if (!onboarding) {
      const userNameParts = ((driver.userId as any)?.name || "").split(" ");
      const firstName = userNameParts[0] || "";
      const lastName = userNameParts.slice(1).join(" ") || "";

      const created = await Onboarding.create({
        driverId: driver._id,
        onboardingStatus: DriverOnboardingStatus.NOT_STARTED,
        verificationStatus: DriverVerificationStatus.NOT_VERIFIED,
        personalInfo: {
          firstName,
          lastName,
          dateOfBirth: new Date("1990-01-01"),
          phoneNumber: (driver.userId as any)?.phone || "",
          idDocumentType: "NATIONAL_ID",
          idDocumentNumber: "",
        },
        address: {
          street: "",
          city: "",
          state: "",
          country: "Rwanda",
        },
        vehicleInfo: {
          make: "",
          model: "",
          year: new Date().getFullYear(),
          color: "",
          licensePlate: "",
        },
        documents: {},
      });

      onboarding = await Onboarding.findById(created._id).populate({
        path: "driverId",
        populate: { path: "userId", select: "name email phone" },
      });
    }

    return onboarding!;
  }

  static async saveDraft(userId: string, data: any): Promise<IOnboarding> {
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw { statusCode: 404, message: "Driver profile not found" };
    }

    let onboarding = await Onboarding.findOne({ driverId: driver._id });
    if (!onboarding) {
      onboarding = new Onboarding({
        driverId: driver._id,
        onboardingStatus: DriverOnboardingStatus.IN_PROGRESS,
        verificationStatus: DriverVerificationStatus.NOT_VERIFIED,
      });
    }

    if (data.personalInfo) {
      onboarding.personalInfo = {
        ...onboarding.personalInfo,
        ...data.personalInfo,
        ...(data.personalInfo.dateOfBirth
          ? { dateOfBirth: new Date(data.personalInfo.dateOfBirth) }
          : {}),
      };
    }

    if (data.address) {
      onboarding.address = {
        ...onboarding.address,
        ...data.address,
      };
    }

    if (data.vehicleInfo) {
      onboarding.vehicleInfo = {
        ...onboarding.vehicleInfo,
        ...data.vehicleInfo,
      };
    }

    if (data.documents) {
      onboarding.documents = {
        ...onboarding.documents,
        ...data.documents,
      };
    }

    if (onboarding.onboardingStatus === DriverOnboardingStatus.NOT_STARTED) {
      onboarding.onboardingStatus = DriverOnboardingStatus.IN_PROGRESS;
    }

    await onboarding.save();
    return onboarding;
  }

  static async updatePersonalInfo(
    userId: string,
    data: any,
  ): Promise<IOnboarding> {
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw { statusCode: 404, message: "Driver profile not found" };
    }

    let onboarding = await Onboarding.findOne({ driverId: driver._id });
    if (!onboarding) {
      onboarding = new Onboarding({
        driverId: driver._id,
        onboardingStatus: DriverOnboardingStatus.IN_PROGRESS,
        verificationStatus: DriverVerificationStatus.NOT_VERIFIED,
      });
    }

    onboarding.personalInfo = {
      ...onboarding.personalInfo,
      ...data,
      dateOfBirth: new Date(data.dateOfBirth),
    };

    if (onboarding.onboardingStatus === DriverOnboardingStatus.NOT_STARTED) {
      onboarding.onboardingStatus = DriverOnboardingStatus.IN_PROGRESS;
    }

    await onboarding.save();
    return onboarding;
  }

  static async updateAddress(userId: string, data: any): Promise<IOnboarding> {
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw { statusCode: 404, message: "Driver profile not found" };
    }

    let onboarding = await Onboarding.findOne({ driverId: driver._id });
    if (!onboarding) {
      onboarding = new Onboarding({
        driverId: driver._id,
        onboardingStatus: DriverOnboardingStatus.IN_PROGRESS,
        verificationStatus: DriverVerificationStatus.NOT_VERIFIED,
      });
    }

    onboarding.address = {
      ...onboarding.address,
      ...data,
    };

    if (onboarding.onboardingStatus === DriverOnboardingStatus.NOT_STARTED) {
      onboarding.onboardingStatus = DriverOnboardingStatus.IN_PROGRESS;
    }

    await onboarding.save();
    return onboarding;
  }

  static async updateVehicleInfo(
    userId: string,
    data: any,
  ): Promise<IOnboarding> {
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw { statusCode: 404, message: "Driver profile not found" };
    }

    let onboarding = await Onboarding.findOne({ driverId: driver._id });
    if (!onboarding) {
      onboarding = new Onboarding({
        driverId: driver._id,
        onboardingStatus: DriverOnboardingStatus.IN_PROGRESS,
        verificationStatus: DriverVerificationStatus.NOT_VERIFIED,
      });
    }

    onboarding.vehicleInfo = {
      ...onboarding.vehicleInfo,
      ...data,
    };

    if (onboarding.onboardingStatus === DriverOnboardingStatus.NOT_STARTED) {
      onboarding.onboardingStatus = DriverOnboardingStatus.IN_PROGRESS;
    }

    await onboarding.save();
    return onboarding;
  }

  static async updateDocuments(
    userId: string,
    data: any,
  ): Promise<IOnboarding> {
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw { statusCode: 404, message: "Driver profile not found" };
    }

    let onboarding = await Onboarding.findOne({ driverId: driver._id });
    if (!onboarding) {
      onboarding = new Onboarding({
        driverId: driver._id,
        onboardingStatus: DriverOnboardingStatus.IN_PROGRESS,
        verificationStatus: DriverVerificationStatus.NOT_VERIFIED,
      });
    }

    onboarding.documents = {
      ...onboarding.documents,
      ...data,
    };

    if (onboarding.onboardingStatus === DriverOnboardingStatus.NOT_STARTED) {
      onboarding.onboardingStatus = DriverOnboardingStatus.IN_PROGRESS;
    }

    await onboarding.save();
    return onboarding;
  }

  static async submitApplication(userId: string): Promise<IOnboarding> {
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw { statusCode: 404, message: "Driver profile not found" };
    }

    let onboarding = await Onboarding.findOne({ driverId: driver._id });
    if (!onboarding) {
      onboarding = (await this.getOrCreateOnboarding(userId)) as any;
    }

    const current = onboarding!;
    const errors: string[] = [];

    // Validate personalInfo
    if (
      !current.personalInfo?.firstName ||
      !current.personalInfo?.lastName ||
      !current.personalInfo?.dateOfBirth ||
      !current.personalInfo?.phoneNumber ||
      !current.personalInfo?.idDocumentNumber
    ) {
      errors.push("Personal information is incomplete");
    }

    // Validate address
    if (
      !current.address?.street ||
      !current.address?.city ||
      !current.address?.state ||
      !current.address?.country
    ) {
      errors.push("Address details are incomplete");
    }

    // Validate vehicleInfo
    if (!current.vehicleInfo?.color || !current.vehicleInfo?.licensePlate) {
      errors.push("Vehicle information is incomplete");
    }

    // Validate documents
    if (!current.documents?.idDocument || !current.documents?.drivingLicense) {
      errors.push(
        "Required documents (ID document & driving license) must be provided",
      );
    }

    if (errors.length > 0) {
      throw {
        statusCode: 400,
        message: "Cannot submit application: incomplete information",
        errors,
      };
    }

    current.onboardingStatus = DriverOnboardingStatus.COMPLETED;
    current.verificationStatus =
      DriverVerificationStatus.VERIFICATION_IN_PROGRESS;
    await current.save();

    return current;
  }

  static async listApplications(query: {
    onboardingStatus?: DriverOnboardingStatus;
    verificationStatus?: DriverVerificationStatus;
    page?: string;
    limit?: string;
  }): Promise<{
    applications: IOnboarding[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, parseInt(query.page || "1", 10));
    const limit = Math.max(1, parseInt(query.limit || "10", 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.onboardingStatus) {
      filter.onboardingStatus = query.onboardingStatus;
    }
    if (query.verificationStatus) {
      filter.verificationStatus = query.verificationStatus;
    }

    const [applications, total] = await Promise.all([
      Onboarding.find(filter)
        .populate({
          path: "driverId",
          populate: { path: "userId", select: "name email phone" },
        })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Onboarding.countDocuments(filter),
    ]);

    return {
      applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getApplicationById(id: string): Promise<IOnboarding> {
    let onboarding: IOnboarding | null = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      onboarding = await Onboarding.findById(id).populate({
        path: "driverId",
        populate: { path: "userId", select: "name email phone" },
      });

      if (!onboarding) {
        onboarding = await Onboarding.findOne({ driverId: id }).populate({
          path: "driverId",
          populate: { path: "userId", select: "name email phone" },
        });
      }
    }

    if (!onboarding) {
      throw { statusCode: 404, message: "Onboarding application not found" };
    }

    return onboarding;
  }

  static async verifyApplication(
    id: string,
    status: DriverVerificationStatus,
    adminUserId: string,
    notes?: string,
  ): Promise<IOnboarding> {
    const onboarding = await Onboarding.findById(id);
    if (!onboarding) {
      throw { statusCode: 404, message: "Onboarding application not found" };
    }

    onboarding.verificationStatus = status;

    const driver = await Driver.findById(onboarding.driverId);
    if (driver) {
      if (status === DriverVerificationStatus.VERIFIED) {
        driver.approvalStatus = DriverApprovalStatus.APPROVED;

        // Auto-create or link vehicle
        if (onboarding.vehicleInfo?.licensePlate) {
          let vehicle = await Vehicle.findOne({
            registrationNumber: onboarding.vehicleInfo.licensePlate
              .trim()
              .toUpperCase(),
          });

          if (!vehicle) {
            vehicle = await Vehicle.create({
              driverId: driver._id,
              registrationNumber: onboarding.vehicleInfo.licensePlate
                .trim()
                .toUpperCase(),
              make: onboarding.vehicleInfo.make || "Standard",
              model: onboarding.vehicleInfo.model || "Sedan",
              year: onboarding.vehicleInfo.year || new Date().getFullYear(),
              color: onboarding.vehicleInfo.color || "White",
              category: VehicleCategory.STANDARD,
              status: VehicleStatus.ACTIVE,
            });
          } else {
            vehicle.driverId = driver._id;
            vehicle.status = VehicleStatus.ACTIVE;
            await vehicle.save();
          }

          driver.activeVehicleId = vehicle._id;
        }

        if (onboarding.personalInfo?.idDocumentNumber) {
          driver.licenseNumber = onboarding.personalInfo.idDocumentNumber;
        }

        await driver.save();
      } else if (status === DriverVerificationStatus.REJECTED) {
        driver.approvalStatus = DriverApprovalStatus.REJECTED;
        onboarding.onboardingStatus = DriverOnboardingStatus.REJECTED;
        await driver.save();
      }
    }

    await onboarding.save();

    const result = await Onboarding.findById(onboarding._id).populate({
      path: "driverId",
      populate: { path: "userId", select: "name email phone" },
    });

    return result!;
  }
}
