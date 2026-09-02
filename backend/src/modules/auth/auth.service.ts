import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, IUser } from "../users/user.model";
import { Customer } from "../customers/customer.model";
import { Driver } from "../drivers/driver.model";
import { UserRole, UserStatus } from "../../constants/roles";
import { env } from "../../config/env";
import { JwtPayload } from "../../middlewares/auth";

export interface RegisterDTO {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
  licenseNumber?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    status: UserStatus;
  };
  tokens: AuthTokens;
  profileId?: string;
}

export class AuthService {
  private static generateTokens(user: IUser): AuthTokens {
    const payload: JwtPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });

    return { accessToken, refreshToken };
  }

  static async register(dto: RegisterDTO): Promise<AuthResponse> {
    const existingUser = await User.findOne({
      $or: [{ email: dto.email.toLowerCase() }, { phone: dto.phone }],
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === dto.email.toLowerCase()) {
        throw { statusCode: 409, message: "Email is already registered" };
      }
      throw { statusCode: 409, message: "Phone number is already registered" };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const userRole = dto.role || UserRole.CUSTOMER;

    const user = new User({
      name: dto.name,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      passwordHash,
      role: userRole,
      status: UserStatus.ACTIVE,
    });

    const tokens = this.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    let profileId: string | undefined;

    if (userRole === UserRole.CUSTOMER) {
      const customer = await Customer.create({ userId: user._id });
      profileId = customer._id.toString();
    } else if (userRole === UserRole.DRIVER) {
      const driver = await Driver.create({
        userId: user._id,
        licenseNumber: dto.licenseNumber || `LIC-${Date.now()}`,
      });
      profileId = driver._id.toString();
    }

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      tokens,
      profileId,
    };
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+passwordHash",
    );
    if (!user) {
      throw { statusCode: 401, message: "Invalid email or password" };
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw {
        statusCode: 403,
        message: "Your account is suspended or inactive",
      };
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw { statusCode: 401, message: "Invalid email or password" };
    }

    const tokens = this.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    let profileId: string | undefined;
    if (user.role === UserRole.CUSTOMER) {
      const customer = await Customer.findOne({ userId: user._id });
      profileId = customer?._id.toString();
    } else if (user.role === UserRole.DRIVER) {
      const driver = await Driver.findOne({ userId: user._id });
      profileId = driver?._id.toString();
    }

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      tokens,
      profileId,
    };
  }

  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(
        refreshToken,
        env.JWT_REFRESH_SECRET,
      ) as JwtPayload;
      const user = await User.findById(decoded.userId).select("+refreshToken");

      if (!user || user.refreshToken !== refreshToken) {
        throw { statusCode: 401, message: "Invalid refresh token" };
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw { statusCode: 403, message: "Account is not active" };
      }

      const tokens = this.generateTokens(user);
      user.refreshToken = tokens.refreshToken;
      await user.save();

      return tokens;
    } catch (error: any) {
      throw { statusCode: 401, message: "Invalid or expired refresh token" };
    }
  }

  static async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
  }
}
