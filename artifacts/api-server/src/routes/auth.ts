import { Router, type IRouter } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { createError } from "../lib/errors";
import { validate } from "../middlewares/validate";
import { authenticate, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["lawyer", "admin", "judge"], {
    errorMap: () => ({ message: "Role must be one of: lawyer, admin, judge" }),
  }),
  phone: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

router.post("/auth/register", validate(registerSchema), async (req, res): Promise<void> => {
  const { name, email, password, role, phone } = req.body as z.infer<typeof registerSchema>;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json(createError("EMAIL_EXISTS", "Email is already registered"));
    return;
  }

  const user = await User.create({ name, email, password, role, phone });

  res.status(201).json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

router.post("/auth/login", validate(loginSchema), async (req, res): Promise<void> => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json(createError("INVALID_CREDENTIALS", "Invalid email or password"));
    return;
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    res.status(401).json(createError("INVALID_CREDENTIALS", "Invalid email or password"));
    return;
  }

  const tokenPayload = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    name: user.name,
  };

  const token = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken({ id: user._id.toString() });

  res.status(200).json({
    success: true,
    data: {
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

router.post(
  "/auth/refresh",
  authenticate,
  validate(refreshSchema),
  async (req: AuthRequest, res): Promise<void> => {
    const { refreshToken } = req.body as z.infer<typeof refreshSchema>;

    try {
      const decoded = verifyRefreshToken(refreshToken);

      const user = await User.findById(decoded.id);
      if (!user) {
        res.status(401).json(createError("INVALID_TOKEN", "User not found"));
        return;
      }

      const newToken = signAccessToken({
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
      });

      res.status(200).json({ success: true, data: { token: newToken } });
    } catch {
      res.status(401).json(createError("INVALID_TOKEN", "Invalid or expired refresh token"));
    }
  },
);

export default router;
