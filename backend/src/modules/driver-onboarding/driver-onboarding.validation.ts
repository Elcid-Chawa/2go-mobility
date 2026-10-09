import { z } from "zod";
import {
  DriverOnboardingStatus,
  DriverVerificationStatus,
} from "../../constants/onboardingStatus";

export const personalInfoSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    dateOfBirth: z
      .string()
      .or(z.date())
      .refine((val) => !isNaN(new Date(val).getTime()), {
        message: "Invalid date of birth",
      }),
    phoneNumber: z.string().min(7, "Phone number must be at least 7 digits"),
    idDocumentType: z.string().min(1, "ID document type is required"),
    idDocumentNumber: z.string().min(1, "ID document number is required"),
  }),
});

export const addressSchema = z.object({
  body: z.object({
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().optional(),
    country: z.string().min(1, "Country is required"),
  }),
});

export const vehicleInfoSchema = z.object({
  body: z.object({
    make: z.string().optional(),
    model: z.string().optional(),
    year: z
      .number()
      .int()
      .min(1990)
      .max(new Date().getFullYear() + 1)
      .optional(),
    color: z.string().min(1, "Vehicle color is required"),
    licensePlate: z.string().min(1, "License plate is required"),
  }),
});

export const documentsSchema = z.object({
  body: z.object({
    idDocument: z.string().url("Invalid ID document URL").or(z.string().min(1)),
    drivingLicense: z
      .string()
      .url("Invalid driving license URL")
      .or(z.string().min(1)),
    vehicleRegistration: z
      .string()
      .url("Invalid vehicle registration URL")
      .or(z.string().min(1))
      .optional(),
    insuranceCertificate: z
      .string()
      .url("Invalid insurance certificate URL")
      .or(z.string().min(1))
      .optional(),
  }),
});

export const saveDraftSchema = z.object({
  body: z.object({
    personalInfo: z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        dateOfBirth: z.string().or(z.date()).optional(),
        phoneNumber: z.string().optional(),
        idDocumentType: z.string().optional(),
        idDocumentNumber: z.string().optional(),
      })
      .optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
    vehicleInfo: z
      .object({
        make: z.string().optional(),
        model: z.string().optional(),
        year: z.number().optional(),
        color: z.string().optional(),
        licensePlate: z.string().optional(),
      })
      .optional(),
    documents: z
      .object({
        idDocument: z.string().optional(),
        drivingLicense: z.string().optional(),
        vehicleRegistration: z.string().optional(),
        insuranceCertificate: z.string().optional(),
      })
      .optional(),
  }),
});

export const verifyApplicationSchema = z.object({
  body: z.object({
    status: z.enum([
      DriverVerificationStatus.VERIFIED,
      DriverVerificationStatus.REJECTED,
    ]),
    rejectionReason: z.string().optional(),
    notes: z.string().optional(),
  }),
  params: z.object({
    id: z.string().min(1, "Application ID is required"),
  }),
});

export const listApplicationsSchema = z.object({
  query: z
    .object({
      onboardingStatus: z.nativeEnum(DriverOnboardingStatus).optional(),
      verificationStatus: z.nativeEnum(DriverVerificationStatus).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .optional(),
});
