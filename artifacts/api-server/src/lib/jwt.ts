import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] as string;
const JWT_REFRESH_SECRET = process.env["JWT_REFRESH_SECRET"] as string;

export function signAccessToken(payload: {
  id: string;
  role: string;
  email: string;
  name: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: { id: string }): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyRefreshToken(token: string): { id: string } {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
}
