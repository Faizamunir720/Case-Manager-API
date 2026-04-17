import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { createError } from "../lib/errors";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
    name: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json(createError("MISSING_TOKEN", "Authentication token is required"));
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json(createError("MISSING_TOKEN", "Authentication token is required"));
    return;
  }

  const JWT_SECRET = process.env["JWT_SECRET"];
  if (!JWT_SECRET) {
    res.status(500).json(createError("SERVER_ERROR", "Server configuration error"));
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      role: string;
      email: string;
      name: string;
    };

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      res.status(401).json(createError("INVALID_TOKEN", "User no longer exists"));
      return;
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json(createError("TOKEN_EXPIRED", "Token has expired"));
      return;
    }
    res.status(401).json(createError("INVALID_TOKEN", "Invalid or malformed token"));
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(createError("MISSING_TOKEN", "Authentication required"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json(
        createError(
          "FORBIDDEN",
          `Access denied. Required role(s): ${roles.join(", ")}`,
        ),
      );
      return;
    }

    next();
  };
}
