import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { authController } from "./auth.controller.js";
import { auth } from "../../middlewares/checkAuth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { authValidation } from "./auth.validation.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import { multerUpload } from "../../config/multer.config.js";
import { authService } from "./auth.service.js";
import { tokenUtils } from "../../utils/token.js";
import { envVars } from "../../config/env.js";

export const authRouter: Router = Router();

// FRONTEND_URL may contain a comma-separated list for CORS; redirects must use
// a single origin.
const frontendUrl = envVars.FRONTEND_URL.split(",")[0].trim();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many requests from this IP, please try again after 15 minutes.",
  },
});

const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many token refresh attempts. Please try again in 15 minutes.",
  },
});

const oauthExchangeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many OAuth exchange attempts. Please try again in 15 minutes.",
  },
});

authRouter.post(
  "/register",
  authRateLimiter,
  multerUpload.single("avatar"),
  validateRequest(authValidation.registerSchema),
  authController.registerUser,
);

authRouter.post(
  "/login",
  authRateLimiter,
  validateRequest(authValidation.loginSchema),
  authController.loginUser,
);

authRouter.get(
  "/me",
  auth(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT),
  authController.getMe,
);

authRouter.patch(
  "/me/avatar",
  auth(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT),
  multerUpload.single("avatar"),
  authController.updateAvatar,
);

// ─────────────── Google OAuth ───────────────
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false }),
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${frontendUrl}/auth/login?error=google_failed` }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as { id: string; name: string; email: string; role: string };
      const { accessToken, refreshToken } = await authService.googleOAuthLogin(user);

      tokenUtils.setAccessTokenCookie(res, accessToken);
      tokenUtils.setRefreshTokenCookie(res, refreshToken);

      // Never put real tokens in the redirect URL. Hand off a short-lived,
      // single-use code that the frontend exchanges server-to-server.
      const code = authService.createGoogleHandoffCode(user.id);
      const callbackUrl = new URL(`${frontendUrl}/auth/google/callback`);
      callbackUrl.searchParams.set("code", code);

      res.set("Cache-Control", "no-store");
      res.set("Referrer-Policy", "no-referrer");
      res.redirect(callbackUrl.toString());
    } catch {
      res.set("Cache-Control", "no-store");
      res.set("Referrer-Policy", "no-referrer");
      res.redirect(`${frontendUrl}/auth/login?error=google_failed`);
    }
  },
);

authRouter.post(
  "/google/exchange",
  oauthExchangeRateLimiter,
  authController.exchangeGoogleCode,
);

authRouter.post(
  "/refresh-token",
  refreshRateLimiter,
  authController.refreshToken,
);

