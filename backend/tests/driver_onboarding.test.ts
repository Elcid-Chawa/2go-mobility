import request from "supertest";
import { createApp } from "../src/app";
import { setupTestDB } from "./setup";
import { UserRole, UserStatus } from "../src/constants/roles";
import {
  DriverOnboardingStatus,
  DriverVerificationStatus,
} from "../src/constants/onboardingStatus";
import { DriverApprovalStatus } from "../src/constants/tripStatus";
import { User } from "../src/modules/users/user.model";
import { Driver } from "../src/modules/drivers/driver.model";
import { Vehicle } from "../src/modules/vehicles/vehicle.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env";
import fs from "fs";
import path from "path";

setupTestDB();

const app = createApp();
const uploadedFiles: string[] = [];

async function uploadRequiredDocuments(token: string): Promise<Record<string, string>> {
  const documents: Record<string, string> = {};
  for (const kind of [
    "profilePhoto",
    "vehiclePreviewImage",
    "idDocument",
    "drivingLicense",
    "vehicleRegistration",
  ]) {
    const response = await request(app)
      .post("/api/v1/onboarding/files")
      .set("Authorization", `Bearer ${token}`)
      .field("kind", kind)
      .attach("file", Buffer.from([0xff, 0xd8, 0xff, 0x00]), {
        filename: `${kind}.jpg`,
        contentType: "image/jpeg",
      });
    expect(response.status).toBe(201);
    const filename = response.body.data.documents[kind];
    documents[kind] = filename;
    uploadedFiles.push(path.join(env.UPLOAD_DIR, filename));
  }
  return documents;
}

afterAll(async () => {
  await Promise.all(
    uploadedFiles.map((file) =>
      fs.promises.unlink(file).catch(() => undefined),
    ),
  );
});

describe("Driver Onboarding Routes", () => {
  let driverAccessToken: string;
  let driverUserId: string;
  let adminAccessToken: string;
  let customerAccessToken: string;

  beforeEach(async () => {
    // 1. Create Driver User & Profile
    const driverRes = await request(app).post("/api/v1/auth/register").send({
      name: "Eric Mugabo",
      email: "eric.driver@example.com",
      phone: "+250788000001",
      password: "Password123!",
      role: UserRole.DRIVER,
      licenseNumber: "DL-RW-12345",
    });
    driverAccessToken = driverRes.body.data.tokens.accessToken;
    driverUserId = driverRes.body.data.user.id;

    // 2. Create Admin User
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("AdminPassword123!", salt);
    const adminUser = await User.create({
      name: "System Admin",
      email: "admin@2go.rw",
      phone: "+250788999999",
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    adminAccessToken = jwt.sign(
      {
        userId: adminUser._id.toString(),
        role: UserRole.ADMIN,
        email: adminUser.email,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" },
    );

    // 3. Create Customer User
    const customerRes = await request(app).post("/api/v1/auth/register").send({
      name: "Customer Alice",
      email: "alice@example.com",
      phone: "+250788111111",
      password: "Password123!",
      role: UserRole.CUSTOMER,
    });
    customerAccessToken = customerRes.body.data.tokens.accessToken;
  });

  describe("GET /api/v1/onboarding/me", () => {
    it("should return initial onboarding profile for authenticated driver", async () => {
      const res = await request(app)
        .get("/api/v1/onboarding/me")
        .set("Authorization", `Bearer ${driverAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.onboardingStatus).toBe(
        DriverOnboardingStatus.NOT_STARTED,
      );
      expect(res.body.data.verificationStatus).toBe(
        DriverVerificationStatus.NOT_VERIFIED,
      );
      expect(res.body.data.personalInfo.firstName).toBe("Eric");
      expect(res.body.data.personalInfo.lastName).toBe("Mugabo");
    });

    it("should reject unauthorized request without token", async () => {
      const res = await request(app).get("/api/v1/onboarding/me");
      expect(res.status).toBe(401);
    });

    it("should reject access for customer role", async () => {
      const res = await request(app)
        .get("/api/v1/onboarding/me")
        .set("Authorization", `Bearer ${customerAccessToken}`);

      expect(res.status).toBe(403);
    });

    it("does not grant privileged roles through public registration", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Unauthorized Operator",
        email: "operator@example.com",
        phone: "+250788111112",
        password: "Password123!",
        role: UserRole.ADMIN,
      });
      expect(res.status).toBe(400);
    });

    it("does not allow a driver to go online before approval", async () => {
      const res = await request(app)
        .patch("/api/v1/drivers/me/status")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .send({ onlineStatus: "ONLINE" });
      expect(res.status).toBe(403);
    });
  });

  describe("Step-by-step onboarding updates", () => {
    it("should update personal information", async () => {
      const res = await request(app)
        .patch("/api/v1/onboarding/personal-info")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .send({
          firstName: "Eric",
          lastName: "Mugabo",
          dateOfBirth: "1992-05-15",
          phoneNumber: "+250788000001",
          idDocumentType: "NATIONAL_ID",
          idDocumentNumber: "1199280012345678",
          drivingLicenseNumber: "DL-RW-12345",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.onboardingStatus).toBe(
        DriverOnboardingStatus.IN_PROGRESS,
      );
      expect(res.body.data.personalInfo.idDocumentNumber).toBe(
        "1199280012345678",
      );
    });

    it("should update address details", async () => {
      const res = await request(app)
        .patch("/api/v1/onboarding/address")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .send({
          street: "KG 15 Ave, House 24",
          city: "Kigali",
          state: "Kigali City",
          country: "Rwanda",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.address.city).toBe("Kigali");
    });

    it("should update vehicle information", async () => {
      const res = await request(app)
        .patch("/api/v1/onboarding/vehicle-info")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .send({
          make: "Toyota",
          model: "Corolla",
          year: 2021,
          color: "Silver",
          licensePlate: "RAB 123 C",
          vin: "VIN-RAB123C",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vehicleInfo.licensePlate).toBe("RAB 123 C");
      expect(res.body.data.vehicleInfo.make).toBe("Toyota");
    });

    it("should update documents", async () => {
      const res = await request(app)
        .patch("/api/v1/onboarding/documents")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .send({
          idDocument: "https://cdn.2go.rw/docs/id_1199280012345678.jpg",
          drivingLicense: "https://cdn.2go.rw/docs/license_DL12345.jpg",
          vehicleRegistration:
            "https://cdn.2go.rw/docs/yellow_card_RAB123C.jpg",
          insuranceCertificate: "https://cdn.2go.rw/docs/insurance_RAB123C.jpg",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documents.idDocument).toContain(
        "id_1199280012345678.jpg",
      );
      expect(res.body.data.documents.drivingLicense).toContain(
        "license_DL12345.jpg",
      );
    });

    it("stores uploaded files privately and rejects non-image content", async () => {
      const uploaded = await request(app)
        .post("/api/v1/onboarding/files")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .field("kind", "profilePhoto")
        .attach("file", Buffer.from([0xff, 0xd8, 0xff, 0x00]), {
          filename: "profile.jpg",
          contentType: "image/jpeg",
        });
      expect(uploaded.status).toBe(201);
      const filename = uploaded.body.data.documents.profilePhoto as string;
      uploadedFiles.push(path.join(env.UPLOAD_DIR, filename));

      const ownerRead = await request(app)
        .get(`/api/v1/onboarding/files/${filename}`)
        .set("Authorization", `Bearer ${driverAccessToken}`);
      expect(ownerRead.status).toBe(200);

      const otherUserRead = await request(app)
        .get(`/api/v1/onboarding/files/${filename}`)
        .set("Authorization", `Bearer ${customerAccessToken}`);
      expect(otherUserRead.status).toBe(403);

      const invalid = await request(app)
        .post("/api/v1/onboarding/files")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .field("kind", "vehiclePreviewImage")
        .attach("file", Buffer.from("<html>not an image</html>"), {
          filename: "vehicle.jpg",
          contentType: "image/jpeg",
        });
      expect(invalid.status).toBe(400);
    });

    it("should save draft with partial data", async () => {
      const res = await request(app)
        .post("/api/v1/onboarding/draft")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .send({
          personalInfo: {
            idDocumentNumber: "1199280099999999",
          },
          vehicleInfo: {
            color: "Midnight Blue",
            licensePlate: "RAC 456 D",
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.personalInfo.idDocumentNumber).toBe(
        "1199280099999999",
      );
      expect(res.body.data.vehicleInfo.color).toBe("Midnight Blue");
    });
  });

  describe("POST /api/v1/onboarding/submit", () => {
    it("should fail submission when required data is missing", async () => {
      const res = await request(app)
        .post("/api/v1/onboarding/submit")
        .set("Authorization", `Bearer ${driverAccessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("incomplete information");
    });

    it("should submit successfully when all details are filled", async () => {
      // 1. Populate all sections
      await request(app)
        .patch("/api/v1/onboarding/personal-info")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .send({
          firstName: "Eric",
          lastName: "Mugabo",
          dateOfBirth: "1992-05-15",
          phoneNumber: "+250788000001",
          idDocumentType: "NATIONAL_ID",
          idDocumentNumber: "1199280012345678",
          drivingLicenseNumber: "DL-RW-12345",
        });

      await request(app)
        .patch("/api/v1/onboarding/address")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .send({
          street: "KG 15 Ave",
          city: "Kigali",
          state: "Kigali City",
          country: "Rwanda",
        });

      await request(app)
        .patch("/api/v1/onboarding/vehicle-info")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .send({
          make: "Toyota",
          model: "Corolla",
          year: 2021,
          color: "White",
          licensePlate: "RAE 789 X",
          vin: "VIN-RAE789X",
        });

      const documents = await uploadRequiredDocuments(driverAccessToken);
      await request(app)
        .patch("/api/v1/onboarding/documents")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .send({
          ...documents,
        });

      // 2. Submit application
      const submitRes = await request(app)
        .post("/api/v1/onboarding/submit")
        .set("Authorization", `Bearer ${driverAccessToken}`);

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);
      expect(submitRes.body.data.onboardingStatus).toBe(
        DriverOnboardingStatus.COMPLETED,
      );
      expect(submitRes.body.data.verificationStatus).toBe(
        DriverVerificationStatus.VERIFICATION_IN_PROGRESS,
      );
    });
  });

  describe("Admin / Operations Verification Workflow", () => {
    let applicationId: string;

    beforeEach(async () => {
      // Complete & submit onboarding
      await request(app)
        .post("/api/v1/onboarding/draft")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .send({
          personalInfo: {
            firstName: "Eric",
            lastName: "Mugabo",
            dateOfBirth: "1992-05-15",
            phoneNumber: "+250788000001",
            idDocumentType: "NATIONAL_ID",
            idDocumentNumber: "1199280012345678",
            drivingLicenseNumber: "DL-RW-12345",
          },
          address: {
            street: "KG 15 Ave",
            city: "Kigali",
            state: "Kigali City",
            country: "Rwanda",
          },
          vehicleInfo: {
            make: "Toyota",
            model: "Corolla",
            year: 2022,
            color: "Silver",
            licensePlate: "RAD 999 Z",
            vin: "VIN-RAD999Z",
          },
        });

      const documents = await uploadRequiredDocuments(driverAccessToken);
      await request(app)
        .post("/api/v1/onboarding/draft")
        .set("Authorization", `Bearer ${driverAccessToken}`)
        .send({ documents });

      const submitRes = await request(app)
        .post("/api/v1/onboarding/submit")
        .set("Authorization", `Bearer ${driverAccessToken}`);

      applicationId = submitRes.body.data._id;
    });

    it("should allow admin to list onboarding applications", async () => {
      const res = await request(app)
        .get("/api/v1/onboarding/admin/applications")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applications.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });

    it("enforces operational permissions on administration endpoints", async () => {
      const response = await request(app)
        .get("/api/v1/admin/users")
        .set("Authorization", `Bearer ${customerAccessToken}`);
      expect(response.status).toBe(403);
    });

    it("should allow admin to view specific application by ID", async () => {
      const res = await request(app)
        .get(`/api/v1/onboarding/admin/applications/${applicationId}`)
        .set("Authorization", `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(applicationId);
      expect(res.body.data.personalInfo.firstName).toBe("Eric");
    });

    it("should verify driver application, activate driver and create vehicle", async () => {
      const verifyRes = await request(app)
        .patch(`/api/v1/onboarding/admin/applications/${applicationId}/verify`)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({
          status: DriverVerificationStatus.VERIFIED,
          notes: "All documents verified and valid",
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.verificationStatus).toBe(
        DriverVerificationStatus.VERIFIED,
      );

      // Verify driver model status
      const driver = await Driver.findOne({ userId: driverUserId });
      expect(driver).toBeDefined();
      expect(driver!.approvalStatus).toBe(DriverApprovalStatus.APPROVED);
      expect(driver!.activeVehicleId).toBeDefined();

      // Verify vehicle was created
      const vehicle = await Vehicle.findById(driver!.activeVehicleId);
      expect(vehicle).toBeDefined();
      expect(vehicle!.registrationNumber).toBe("RAD 999 Z");
      expect(vehicle!.make).toBe("Toyota");
      expect(vehicle!.model).toBe("Corolla");
    });

    it("should reject driver application when documents are invalid", async () => {
      const rejectRes = await request(app)
        .patch(`/api/v1/onboarding/admin/applications/${applicationId}/verify`)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({
          status: DriverVerificationStatus.REJECTED,
          rejectionReason: "Invalid national ID document",
        });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.success).toBe(true);
      expect(rejectRes.body.data.verificationStatus).toBe(
        DriverVerificationStatus.REJECTED,
      );
      expect(rejectRes.body.data.onboardingStatus).toBe(
        DriverOnboardingStatus.REJECTED,
      );

      const driver = await Driver.findOne({ userId: driverUserId });
      expect(driver!.approvalStatus).toBe(DriverApprovalStatus.REJECTED);
    });
  });
});
