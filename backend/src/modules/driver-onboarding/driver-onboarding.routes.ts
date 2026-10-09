import { Router } from "express";
import { DriverOnboardingController } from "./driver-onboarding.controller";
import { authenticate, requireRoles } from "../../middlewares/auth";
import { UserRole } from "../../constants/roles";
import { validate } from "../../middlewares/validate";
import {
  personalInfoSchema,
  addressSchema,
  vehicleInfoSchema,
  documentsSchema,
  saveDraftSchema,
  verifyApplicationSchema,
  listApplicationsSchema,
} from "./driver-onboarding.validation";

const router = Router();

// All onboarding endpoints require authentication
router.use(authenticate);

// Driver endpoints
router.get(
  "/me",
  requireRoles(UserRole.DRIVER, UserRole.ADMIN),
  DriverOnboardingController.getMyOnboarding,
);

router.get(
  "/status",
  requireRoles(UserRole.DRIVER, UserRole.ADMIN),
  DriverOnboardingController.getMyOnboarding,
);

router.post(
  "/draft",
  requireRoles(UserRole.DRIVER, UserRole.ADMIN),
  validate(saveDraftSchema),
  DriverOnboardingController.saveDraft,
);

router.put(
  "/draft",
  requireRoles(UserRole.DRIVER, UserRole.ADMIN),
  validate(saveDraftSchema),
  DriverOnboardingController.saveDraft,
);

router.patch(
  "/personal-info",
  requireRoles(UserRole.DRIVER, UserRole.ADMIN),
  validate(personalInfoSchema),
  DriverOnboardingController.updatePersonalInfo,
);

router.patch(
  "/address",
  requireRoles(UserRole.DRIVER, UserRole.ADMIN),
  validate(addressSchema),
  DriverOnboardingController.updateAddress,
);

router.patch(
  "/vehicle-info",
  requireRoles(UserRole.DRIVER, UserRole.ADMIN),
  validate(vehicleInfoSchema),
  DriverOnboardingController.updateVehicleInfo,
);

router.patch(
  "/documents",
  requireRoles(UserRole.DRIVER, UserRole.ADMIN),
  validate(documentsSchema),
  DriverOnboardingController.updateDocuments,
);

router.post(
  "/submit",
  requireRoles(UserRole.DRIVER, UserRole.ADMIN),
  DriverOnboardingController.submitApplication,
);

// Admin / Operations endpoints
router.get(
  "/admin/applications",
  requireRoles(UserRole.OPERATIONS, UserRole.ADMIN),
  validate(listApplicationsSchema),
  DriverOnboardingController.listApplications,
);

router.get(
  "/admin/applications/:id",
  requireRoles(UserRole.OPERATIONS, UserRole.ADMIN),
  DriverOnboardingController.getApplicationById,
);

router.patch(
  "/admin/applications/:id/verify",
  requireRoles(UserRole.OPERATIONS, UserRole.ADMIN),
  validate(verifyApplicationSchema),
  DriverOnboardingController.verifyApplication,
);

export default router;
