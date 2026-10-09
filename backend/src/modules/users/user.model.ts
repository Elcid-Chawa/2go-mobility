import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { UserRole, UserStatus } from "../../constants/roles";

export interface IUser extends Document {
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  refreshToken?: string;
  profile?: {
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  saved_places: {
    label: string;
    address: string;
    location: {
      lat: number;
      lng: number;
    };
  }[];
  trusted_contacts?: {
    name: string;
    phone_number: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
      index: true,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    profile: {
      first_name: { type: String, trim: true },
      last_name: { type: String, trim: true },
      avatar_url: { type: String, trim: true },
    },
    saved_places: [
      {
        label: { type: String, trim: true },
        address: { type: String, trim: true },
        location: {
          lat: { type: Number },
          lng: { type: Number },
        },
      },
    ],
    trusted_contacts: [
      {
        name: { type: String, trim: true },
        phone_number: { type: String, trim: true },
      },
    ],
  },
  {
    timestamps: true,
  },
);

UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser>("User", UserSchema);
