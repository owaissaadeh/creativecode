import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Separate fallback string from the staff JWT_SECRET (server/routes.ts) so that even if
// SESSION_SECRET/PORTAL_SESSION_SECRET end up identical, the `type` claim check below is
// the real boundary — belt-and-suspenders defense in depth, not the sole protection.
const PORTAL_JWT_SECRET = process.env.PORTAL_SESSION_SECRET || process.env.SESSION_SECRET || "crm-secret-key-2026";

export interface PortalClientUser {
  clientUserId: string;
  clientId: string;
  role: string;
  type: "client";
}

export interface PortalAuthRequest extends Request {
  clientUser?: PortalClientUser;
}

export function portalAuthMiddleware(req: PortalAuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "غير مصرح" });
  try {
    const decoded = jwt.verify(token, PORTAL_JWT_SECRET) as any;
    if (decoded.type !== "client") return res.status(401).json({ message: "جلسة غير صالحة" });
    req.clientUser = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "جلسة منتهية" });
  }
}

export function signPortalToken(payload: { clientUserId: string; clientId: string; role: string }) {
  return jwt.sign({ ...payload, type: "client" }, PORTAL_JWT_SECRET, { expiresIn: "7d" });
}
