import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/auth";
import { ApiResponse } from "../../utils/apiResponse";
import { DriverOnboardingService } from "./driver-onboarding.service";

export class DriverOnboardingController {
  static async getMyOnboarding(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const data = await DriverOnboardingService.getOrCreateOnboarding(
        req.userId!,
      );
      ApiResponse.success(res, data, "Driver onboarding profile retrieved");
    } catch (error) {
      next(error);
    }
  }

  static async saveDraft(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const data = await DriverOnboardingService.saveDraft(
        req.userId!,
        req.body,
      );
      ApiResponse.success(res, data, "Onboarding draft saved successfully");
    } catch (error) {
      next(error);
    }
  }

  static async updatePersonalInfo(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const data = await DriverOnboardingService.updatePersonalInfo(
        req.userId!,
        req.body,
      );
      ApiResponse.success(
        res,
        data,
        "Personal information updated successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateAddress(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const data = await DriverOnboardingService.updateAddress(
        req.userId!,
        req.body,
      );
      ApiResponse.success(res, data, "Address updated successfully");
    } catch (error) {
      next(error);
    }
  }

  static async updateVehicleInfo(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const data = await DriverOnboardingService.updateVehicleInfo(
        req.userId!,
        req.body,
      );
      ApiResponse.success(
        res,
        data,
        "Vehicle information updated successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateDocuments(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const data = await DriverOnboardingService.updateDocuments(
        req.userId!,
        req.body,
      );
      ApiResponse.success(res, data, "Documents updated successfully");
    } catch (error) {
      next(error);
    }
  }

  static async submitApplication(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const data = await DriverOnboardingService.submitApplication(req.userId!);
      ApiResponse.success(
        res,
        data,
        "Onboarding application submitted for verification",
      );
    } catch (error) {
      next(error);
    }
  }

  // Admin / Operations handlers
  static async listApplications(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const data = await DriverOnboardingService.listApplications(
        req.query as any,
      );
      ApiResponse.success(res, data, "Onboarding applications retrieved");
    } catch (error) {
      next(error);
    }
  }

  static async getApplicationById(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const data = await DriverOnboardingService.getApplicationById(id);
      ApiResponse.success(res, data, "Onboarding application retrieved");
    } catch (error) {
      next(error);
    }
  }

  static async verifyApplication(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const data = await DriverOnboardingService.verifyApplication(
        id,
        req.body.status,
        req.userId!,
        req.body.notes,
        req.body.rejectionReason,
      );
      ApiResponse.success(res, data, "Onboarding application status updated");
    } catch (error) {
      next(error);
    }
  }

  static async uploadDocument(
      req: AuthRequest,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        const filename = req.file?.filename;
        if (!filename) {
          ApiResponse.error(res, "A supported image or document file is required", 400);
          return;
        }
        const data = await DriverOnboardingService.uploadDocument(
          req.userId!,
          req.body.kind,
          filename,
        );
        ApiResponse.created(res, data, "Onboarding file uploaded");
      } catch (error) {
        next(error);
      }
    }

    static async getDocument(
      req: AuthRequest,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        const filename = req.params.filename as string;
        const filePath = await DriverOnboardingService.getDocumentPath(
          req.userId!,
          req.userRole!,
          filename,
        );
        res.sendFile(filePath, (error) => {
          if (error) next(error);
        });
      } catch (error) {
        next(error);
      }
  }
}
