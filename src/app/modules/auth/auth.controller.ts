import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync.js";
import { authService } from "./auth.service.js";
import { sendResponse } from "../../shared/sendResponse.js";
import httpStatus from "http-status";
import { tokenUtils } from "../../utils/token.js";
import AppError from "../../errorHelpers/AppError.js";
import { IRegisterUserPayload } from "./auth.interface.js";
import { IRequestUser } from "../../interfaces/requestUser.interface.js";

const registerUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = (req.body ?? {}) as Record<string, unknown>;
    const file = req.file as
      | (Express.Multer.File & { path?: string })
      | undefined;

    const avatarFromBody =
      typeof payload.avatar === "string" && payload.avatar.trim()
        ? payload.avatar
        : typeof payload.avatarUrl === "string" && payload.avatarUrl.trim()
          ? payload.avatarUrl
          : undefined;

    const result = await authService.registerUser(
      {
        ...(payload as Record<string, unknown>),
        avatar: avatarFromBody,
      } as IRegisterUserPayload,
      file?.path,
    );

    res.set("Cache-Control", "no-store");
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "User registered successfully",
      data: result,
    });
  },
);

const loginUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;
    const result = await authService.loginUser(payload);
    const { accessToken, refreshToken, ...rest } = result;

    tokenUtils.setAccessTokenCookie(res, accessToken);
    tokenUtils.setRefreshTokenCookie(res, refreshToken);

    res.set("Cache-Control", "no-store");
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User logged in successfully",
      data: {
        accessToken,
        refreshToken,
        ...rest,
      },
    });
  },
);

const getMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IRequestUser;

    const result = await authService.getMe(user);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User fetched successfully",
      data: result,
    });
  },
);

const exchangeGoogleCode = catchAsync(
  async (req: Request, res: Response) => {
    const code = req.body?.code;

    if (typeof code !== "string" || !code.trim()) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Authorization code is required.",
      );
    }

    const result = await authService.exchangeGoogleCode(code.trim());

    res.set("Cache-Control", "no-store");
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Google authentication successful",
      data: result,
    });
  },
);

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (typeof token !== "string" || !token) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Refresh token is required.",
    );
  }

  const result = await authService.refreshTokens(token);

  tokenUtils.setAccessTokenCookie(res, result.accessToken);
  tokenUtils.setRefreshTokenCookie(res, result.refreshToken);

  res.set("Cache-Control", "no-store");
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tokens refreshed successfully",
    data: result,
  });
});

const updateAvatar = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      throw new AppError(httpStatus.BAD_REQUEST, "No file was provided.");
    }

    const file = req.file as Express.Multer.File & { path: string };
    const result = await authService.updateAvatar(req.user as IRequestUser, file.path);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Avatar updated successfully",
      data: result,
    });
  },
);

export const authController = {
  registerUser,
  loginUser,
  getMe,
  updateAvatar,
  exchangeGoogleCode,
  refreshToken,
};
