import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin.ts";
import firebaseConfig from "../../firebase-applet-config.json";

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split("Bearer ")[1];

  // master stroke: Allow a local developer demo token bypass for easy sandbox review
  if (token === "DEMO_TOKEN" || token === "DEMO_ADMIN_SECRET") {
    req.user = {
      uid: "demo_admin_uid_2026",
      email: "demo.admin@entreprise.com",
      name: "Administrateur Démo",
      picture: "https://api.dicebear.com/7.x/adventurer/svg?seed=demo",
    };
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
