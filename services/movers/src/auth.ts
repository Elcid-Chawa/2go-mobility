import { NextFunction, Request, Response } from "express";
import { env } from "./config/env";

export type MoverRole =
  | "CUSTOMER"
  | "MOVER_PARTNER"
  | "OPERATIONS"
  | "ADMIN"
  | "SYSTEM_OWNER";

export interface MoverRequest extends Request {
  actor?: { id: string; name: string; email: string; phone?: string; role: MoverRole };
}

export const MOVER_ADMIN_ROLES: MoverRole[] = ["OPERATIONS", "ADMIN", "SYSTEM_OWNER"];

export async function authenticateMoverUser(
  req: MoverRequest,
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
      role: user.role as MoverRole,
    };
    next();
  } catch (error) {
    console.error("Unable to verify movers identity", error);
    res.status(503).json({ success: false, message: "Identity service is unavailable." });
  }
}

export function requireMoverRoles(...roles: MoverRole[]) {
  return (req: MoverRequest, res: Response, next: NextFunction): void => {
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
