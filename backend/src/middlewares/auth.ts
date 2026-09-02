import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, IUser } from '../modules/users/user.model';
import { UserRole } from '../constants/roles';
import { ApiResponse } from '../utils/apiResponse';

export interface AuthRequest extends Request {
  user?: IUser;
  userId?: string;
  userRole?: UserRole;
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.error(res, 'Authentication required. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'ACTIVE') {
      return ApiResponse.error(res, 'User not found or account is not active.', 401);
    }

    req.user = user;
    req.userId = user._id.toString();
    req.userRole = user.role;

    return next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Token has expired', 401);
    }
    return ApiResponse.error(res, 'Invalid authentication token', 401);
  }
};

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): any => {
    if (!req.user || !req.userRole) {
      return ApiResponse.error(res, 'Unauthorized', 401);
    }

    if (!allowedRoles.includes(req.userRole)) {
      return ApiResponse.error(
        res,
        `Forbidden: Access denied for role '${req.userRole}'. Allowed: [${allowedRoles.join(', ')}]`,
        403
      );
    }

    return next();
  };
};
