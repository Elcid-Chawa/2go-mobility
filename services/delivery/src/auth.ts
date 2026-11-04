import { NextFunction, Request, Response } from "express";
import { env } from "./config/env";

export type DeliveryRole =
  | "CUSTOMER"
  | "DRIVER"
  | "OPERATIONS"
  | "DISPATCHER"
  | "ADMIN"
  | "SYSTEM_OWNER"
  | "AGENT"
  | "VIEWER";

export interface DeliveryRequest extends Request {
  actor?: { id: string; name: string; email: string; phone?: string; role: DeliveryRole };
}

export const DELIVERY_OPERATIONS_ROLES: DeliveryRole[] = [
  "OPERATIONS",
  "DISPATCHER",
  "ADMIN",
  "SYSTEM_OWNER",
];

export async function authenticateDeliveryUser(
  req: DeliveryRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }
  try {
    const response = await fetch(`${env.AUTH_API_URL}/auth/me`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 401 || response.status === 403) {
      res.status(401).json({ success: false, message: "Your session is invalid or expired." });
      return;
    }
    if (!response.ok) {
      console.error("Identity service returned an unexpected status", response.status);
      res.status(503).json({ success: false, message: "Identity service is unavailable." });
      return;
    }
    const result = (await response.json()) as {
      success?: boolean;
      data?: { user?: { id?: string; _id?: string; name?: string; email?: string; phone?: string; role?: string } };
    };
    const user = result.data?.user;
    if (!result.success || !user?.role || !(user.id || user._id)) {
      res.status(401).json({ success: false, message: "Invalid identity response." });
      return;
    }
    req.actor = {
      id: String(user.id || user._id),
      name: user.name || "",
      email: user.email || "",
      phone: user.phone,
      role: user.role as DeliveryRole,
    };
    next();
  } catch (error) {
    console.error("Unable to verify delivery identity", error);
    res.status(503).json({ success: false, message: "Identity service is unavailable." });
  }
}

export function requireDeliveryRoles(...roles: DeliveryRole[]) {
  return (req: DeliveryRequest, res: Response, next: NextFunction): void => {
    if (!req.actor) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }
    if (!roles.includes(req.actor.role)) {
      res.status(403).json({ success: false, message: "You are not allowed to perform this action." });
      return;
    }
    next();
  };
}
