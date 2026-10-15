import mongoose from "mongoose";
import { Onboarding, IOnboarding } from "./driver-onboarding.model";
import { Driver, IDriver } from "../drivers/driver.model";
import { Vehicle } from "../vehicles/vehicle.model";
import {
  DriverOnboardingStatus,
  DriverVerificationStatus,
} from "../../constants/onboardingStatus";
import {
  DriverApprovalStatus,
  DriverOnlineStatus,
} from "../../constants/tripStatus";
import {
  VehicleCategory,
  VehicleStatus,
} from "../../constants/vehicleCategory";
import { UserRole } from "../../constants/roles";
import path from "path";
import fs from "fs";
import { env } from "../../config/env";
import { User } from "../users/user.model";

export class DriverOnboardingService {
  private static async markDraft(
    onboarding: IOnboarding,
    driver: IDriver,
  ): Promise<void> {
    if (
      onboarding.onboardingStatus === DriverOnboardingStatus.NOT_STARTED ||
      onboarding.onboardingStatus === DriverOnboardingStatus.REJECTED ||
      onboarding.onboardingStatus === DriverOnboardingStatus.COMPLETED ||
      onboarding.verificationStatus === DriverVerificationStatus.VERIFIED
    ) {
      onboarding.onboardingStatus = DriverOnboardingStatus.IN_PROGRESS;
      onboarding.verificationStatus = DriverVerificationStatus.NOT_VERIFIED;
      onboarding.review = undefined;
      driver.approvalStatus = DriverApprovalStatus.PENDING;
      driver.onlineStatus = DriverOnlineStatus.OFFLINE;
      await driver.save();
    }
  }

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
        ...(data.personalInfo.drivingLicenseExpiryDate
          ? { drivingLicenseExpiryDate: new Date(data.personalInfo.drivingLicenseExpiryDate) }
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

    await this.markDraft(onboarding, driver);
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
      ...(data.dateOfBirth ? { dateOfBirth: new Date(data.dateOfBirth) } : {}),
      ...(data.drivingLicenseExpiryDate
        ? { drivingLicenseExpiryDate: new Date(data.drivingLicenseExpiryDate) }
        : {}),
    };

    await this.markDraft(onboarding, driver);
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

    await this.markDraft(onboarding, driver);
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

    await this.markDraft(onboarding, driver);
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

    await this.markDraft(onboarding, driver);
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
      !current.personalInfo?.idDocumentNumber ||
      !current.personalInfo?.drivingLicenseNumber
    ) {
      errors.push("Personal information is incomplete");
    }
    if (
      current.personalInfo?.drivingLicenseExpiryDate &&
      current.personalInfo.drivingLicenseExpiryDate <= new Date()
    ) {
      errors.push("Driving license has expired");
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
    if (
      !current.vehicleInfo?.make ||
      !current.vehicleInfo?.model ||
      !current.vehicleInfo?.year ||
      !current.vehicleInfo?.color ||
      !current.vehicleInfo?.licensePlate ||
      !current.vehicleInfo?.vin
    ) {
      errors.push("Vehicle information is incomplete");
    }

    // Validate documents
    if (
      !current.documents?.idDocument ||
      !current.documents?.drivingLicense ||
      !current.documents?.vehicleRegistration ||
      !current.documents?.profilePhoto ||
      !current.documents?.vehiclePreviewImage
    ) {
      errors.push(
        "Profile photo, vehicle photo, ID, driving license, and vehicle registration (vignette) must be provided",
      );
    }
    const requiredUploads = [
      current.documents?.profilePhoto,
      current.documents?.vehiclePreviewImage,
      current.documents?.idDocument,
      current.documents?.drivingLicense,
      current.documents?.vehicleRegistration,
    ];
    if (
      requiredUploads.some(
        (filename) =>
          !filename ||
          !/^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/i.test(filename) ||
          !fs.existsSync(path.resolve(env.UPLOAD_DIR, filename)),
      )
    ) {
      errors.push("Required documents must be uploaded through the secure upload flow");
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
    driver.approvalStatus = DriverApprovalStatus.PENDING;
    driver.onlineStatus = DriverOnlineStatus.OFFLINE;
    await driver.save();
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

    if (
      onboarding.onboardingStatus !== DriverOnboardingStatus.COMPLETED &&
      onboarding.onboardingStatus !== DriverOnboardingStatus.REJECTED
    ) {
      throw { statusCode: 400, message: "Only submitted applications can be reviewed." };
    }

    return onboarding;
  }

  static async verifyApplication(
    id: string,
    status: DriverVerificationStatus,
    adminUserId: string,
    notes?: string,
    rejectionReason?: string,
  ): Promise<IOnboarding> {
    const onboarding = await Onboarding.findById(id);
    if (!onboarding) {
      throw { statusCode: 404, message: "Onboarding application not found" };
    }

    if (onboarding.onboardingStatus !== DriverOnboardingStatus.COMPLETED) {
      throw { statusCode: 400, message: "Only submitted applications can be reviewed." };
    }

    onboarding.verificationStatus = status;
    onboarding.review = {
      reviewedBy: new mongoose.Types.ObjectId(adminUserId),
      reviewedAt: new Date(),
      notes,
      rejectionReason,
    };

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
              vin: onboarding.vehicleInfo.vin,
              make: onboarding.vehicleInfo.make,
              model: onboarding.vehicleInfo.model,
              year: onboarding.vehicleInfo.year,
              color: onboarding.vehicleInfo.color,
              category: (onboarding.vehicleInfo.category || VehicleCategory.STANDARD) as VehicleCategory,
              status: VehicleStatus.ACTIVE,
            });
          } else {
            vehicle.driverId = driver._id;
            vehicle.status = VehicleStatus.ACTIVE;
            await vehicle.save();
          }

          driver.activeVehicleId = vehicle._id;
        }

        if (onboarding.personalInfo?.drivingLicenseNumber) {
          driver.licenseNumber = onboarding.personalInfo.drivingLicenseNumber;
        }

        await driver.save();
      } else if (status === DriverVerificationStatus.REJECTED) {
        driver.approvalStatus = DriverApprovalStatus.REJECTED;
        onboarding.onboardingStatus = DriverOnboardingStatus.REJECTED;
        driver.onlineStatus = DriverOnlineStatus.OFFLINE;
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

  static async uploadDocument(
    userId: string,
    kind: keyof IOnboarding["documents"],
    filename: string,
  ): Promise<IOnboarding> {
    const driver = await Driver.findOne({ userId });
    if (!driver) throw { statusCode: 404, message: "Driver profile not found" };
    const onboarding = await Onboarding.findOneAndUpdate(
      { driverId: driver._id },
      {
        $set: {
          [`documents.${kind}`]: filename,
          onboardingStatus: DriverOnboardingStatus.IN_PROGRESS,
          verificationStatus: DriverVerificationStatus.NOT_VERIFIED,
        },
        $unset: { review: 1 },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    if (!onboarding) {
      throw { statusCode: 500, message: "Uploaded document could not be attached to the application." };
    }
    await this.markDraft(onboarding, driver);
    if (kind === "profilePhoto") {
      await User.findByIdAndUpdate(userId, {
        $set: { "profile.avatar_url": `/api/v1/driver-onboarding/files/${filename}` },
      });
    }
    driver.approvalStatus = DriverApprovalStatus.PENDING;
    driver.onlineStatus = DriverOnlineStatus.OFFLINE;
    await driver.save();
    return onboarding;
  }

  static async getDocumentPath(
    userId: string,
    userRole: UserRole,
    filename: string,
  ): Promise<string> {
    const onboarding = await Onboarding.findOne({
      $or: [
        { "documents.profilePhoto": filename },
        { "documents.vehiclePreviewImage": filename },
        { "documents.idDocument": filename },
        { "documents.drivingLicense": filename },
        { "documents.vehicleRegistration": filename },
        { "documents.insuranceCertificate": filename },
      ],
    }).populate("driverId", "userId");
    if (!onboarding) throw { statusCode: 404, message: "Document not found" };

    const driverUserId = (onboarding.driverId as any)?.userId?.toString();
    const hasReviewPermission = [UserRole.ADMIN, UserRole.SYSTEM_OWNER, UserRole.OPERATIONS].includes(userRole);
    if (!hasReviewPermission && driverUserId !== userId) {
      throw { statusCode: 403, message: "You are not authorized to view this document." };
    }

    const fullPath = path.resolve(env.UPLOAD_DIR, filename);
    if (!fullPath.startsWith(`${path.resolve(env.UPLOAD_DIR)}${path.sep}`) || !fs.existsSync(fullPath)) {
      throw { statusCode: 404, message: "Document file not found" };
    }
    return fullPath;
  }
}
