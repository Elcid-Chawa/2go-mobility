export enum UserRole {
  ADMIN = "ADMIN",
  OPERATIONS = "OPERATIONS",
  DISPATCHER = "DISPATCHER",
  VIEWER = "VIEWER",
}

export enum Permission {
  DRIVER_VERIFY = "DRIVER_VERIFY",
  DISPATCH_EXECUTE = "DISPATCH_EXECUTE",
  FLEET_MANAGE = "FLEET_MANAGE",
  VIEW_OPERATIONS = "VIEW_OPERATIONS",
  ADMIN_SETTINGS = "ADMIN_SETTINGS",
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.DRIVER_VERIFY,
    Permission.DISPATCH_EXECUTE,
    Permission.FLEET_MANAGE,
    Permission.VIEW_OPERATIONS,
    Permission.ADMIN_SETTINGS,
  ],
  [UserRole.OPERATIONS]: [
    Permission.DRIVER_VERIFY,
    Permission.DISPATCH_EXECUTE,
    Permission.FLEET_MANAGE,
    Permission.VIEW_OPERATIONS,
  ],
  [UserRole.DISPATCHER]: [
    Permission.DISPATCH_EXECUTE,
    Permission.VIEW_OPERATIONS,
  ],
  [UserRole.VIEWER]: [Permission.VIEW_OPERATIONS],
};

export const ROLE_LABELS: Record<
  UserRole,
  { label: string; description: string; color: string }
> = {
  [UserRole.ADMIN]: {
    label: "System Administrator",
    description:
      "Full authoritative control, verification, dispatch & platform configuration",
    color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
  [UserRole.OPERATIONS]: {
    label: "Operations Manager",
    description:
      "Driver onboarding verification, fleet management & manual dispatch override",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  [UserRole.DISPATCHER]: {
    label: "Dispatch Controller",
    description:
      "Real-time fleet monitoring & manual trip dispatch assignments",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  [UserRole.VIEWER]: {
    label: "Read-Only Auditor",
    description:
      "Observability, metrics, audit logs and reporting without mutation rights",
    color: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  },
};

export enum DriverOnboardingStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  REJECTED = "REJECTED",
}

export enum DriverVerificationStatus {
  NOT_VERIFIED = "NOT_VERIFIED",
  VERIFICATION_IN_PROGRESS = "VERIFICATION_IN_PROGRESS",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export interface IOnboardingApplication {
  _id: string;
  driverId: {
    _id: string;
    licenseNumber?: string;
    userId?: {
      _id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
  onboardingStatus: DriverOnboardingStatus;
  verificationStatus: DriverVerificationStatus;
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string | Date;
    phoneNumber: string;
    idDocumentType: string;
    idDocumentNumber: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode?: string;
    country: string;
  };
  vehicleInfo: {
    make?: string;
    model?: string;
    year?: number;
    color: string;
    licensePlate: string;
  };
  documents: {
    idDocument?: string;
    drivingLicense?: string;
    vehicleRegistration?: string;
    insuranceCertificate?: string;
  };
  createdAt: string;
  updatedAt: string;
}
