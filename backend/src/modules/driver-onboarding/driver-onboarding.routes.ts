import { Router } from "express";
import { DriverOnboardingController } from "./driver-onboarding.controller";
import { authenticate, requireRoles } from "../../middlewares/auth";
import { UserRole } from "../../constants/roles";
import { validate } from "../../middlewares/validate";
import { requirePermissions } from "../../middlewares/auth";
import { Permission } from "../../constants/permissions";
import {
  uploadOnboardingFile,
  verifyOnboardingFileContent,
  isSafeOnboardingFilename,
} from "./driver-onboarding.upload";
import { ApiResponse } from "../../utils/apiResponse";
import {
  personalInfoSchema,
  addressSchema,
  vehicleInfoSchema,
  documentsSchema,
  saveDraftSchema,
  verifyApplicationSchema,
  listApplicationsSchema,
  uploadDocumentSchema,
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

router.post(
  "/files",
  requireRoles(UserRole.DRIVER),
  uploadOnboardingFile,
  verifyOnboardingFileContent,
  validate(uploadDocumentSchema),
  DriverOnboardingController.uploadDocument,
);

router.get(
  "/files/:filename",
  requireRoles(
    UserRole.DRIVER,
    UserRole.OPERATIONS,
    UserRole.ADMIN,
    UserRole.SYSTEM_OWNER,
  ),
  (req, res, next) => {
    if (!isSafeOnboardingFilename(req.params.filename as string)) {
      ApiResponse.error(res, "Invalid document reference", 400);
      return;
    }
    next();
  },
  DriverOnboardingController.getDocument,
);

// Admin / Operations endpoints
router.get(
  "/admin/applications",
  requirePermissions(Permission.DRIVER_VERIFY),
  validate(listApplicationsSchema),
  DriverOnboardingController.listApplications,
);

router.get(
  "/admin/applications/:id",
  requirePermissions(Permission.DRIVER_VERIFY),
  DriverOnboardingController.getApplicationById,
);

router.patch(
  "/admin/applications/:id/verify",
  requirePermissions(Permission.DRIVER_VERIFY),
  validate(verifyApplicationSchema),
  DriverOnboardingController.verifyApplication,
);

export default router;
