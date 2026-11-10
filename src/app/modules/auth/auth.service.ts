import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { ILoginUser, IRegisterUserPayload } from "./auth.interface.js";
import { envVars } from "../../config/env.js";
import { UserRole, UserStatus } from "../../../generated/prisma/enums.js";
import { tokenUtils } from "../../utils/token.js";
import { jwtUtils } from "../../utils/jwt.js";
import { oauthCodeUtils } from "../../utils/oauthCode.js";
import AppError from "../../errorHelpers/AppError.js";
import status from "http-status";
import type { JwtPayload } from "jsonwebtoken";
import { IRequestUser } from "../../interfaces/requestUser.interface.js";
import { deleteFileFromCloudinary } from "../../config/cloudinary.config.js";

const registerUser = async (
  payload: IRegisterUserPayload,
  fileUrl?: string,
) => {
  const { name, email, password, phone, avatar, role } = payload;

  if (role !== UserRole.TENANT && role !== UserRole.LANDLORD) {
    throw new AppError(
      status.BAD_REQUEST,
      "Invalid role. Only TENANT or LANDLORD can register.",
    );
  }

  const userExists = await prisma.user.findUnique({
    where: { email },
  });

  if (userExists) {
    throw new AppError(status.BAD_REQUEST, "User already exists.");
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(envVars.BCRYPT_SALT_ROUNDS),
  );

  const createdUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone,
      avatar: fileUrl ?? avatar ?? null,
      role,
    },
  });

  const jwtPayload = {
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    role: createdUser.role,
  };

  const accessToken = tokenUtils.getAccessToken(jwtPayload);

  const refreshToken = tokenUtils.getRefreshToken(jwtPayload);

  const userData = await prisma.user.findUnique({
    where: {
      id: createdUser.id,
      email: createdUser.email || email,
    },
    omit: {
      password: true,
    },
  });

  return { accessToken, refreshToken, userData };
};

const loginUser = async (payload: ILoginUser) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
  }

  if (user.status === UserStatus.BANNED) {
    throw new AppError(
      status.FORBIDDEN,
      "Your account has been banned. Please contact support.",
    );
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new AppError(status.UNAUTHORIZED, "Invalid email or password.");
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = tokenUtils.getAccessToken(jwtPayload);

  const refreshToken = tokenUtils.getRefreshToken(jwtPayload);

  const userData = await prisma.user.findUnique({
    where: {
      email: user.email || email,
    },
    omit: {
      password: true,
    },
  });

  return {
    accessToken,
    refreshToken,
    userData,
  };
};

const getMe = async (user: IRequestUser) => {
  const userExists = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    omit: {
      password: true,
    },
  });

  if (!userExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return userExists;
};

const updateAvatar = async (user: IRequestUser, fileUrl: string) => {
  const userExists = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!userExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // If there's an existing avatar URL on Cloudinary/elsewhere, delete it.
  if (userExists.avatar) {
    try {
      await deleteFileFromCloudinary(userExists.avatar);
    } catch (error) {
      console.error("Failed to delete previous avatar:", error);
    }
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      avatar: fileUrl,
    },
    omit: {
      password: true,
    },
  });

  return updatedUser;
};

const googleOAuthLogin = async (user: { id: string }) => {
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    omit: { password: true },
  });

  if (!userData) {
    throw new AppError(status.UNAUTHORIZED, "User not found.");
  }

  if (userData.status === UserStatus.BANNED) {
    throw new AppError(
      status.FORBIDDEN,
      "Your account has been banned. Please contact support.",
    );
  }

  const jwtPayload = {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    role: userData.role,
  };

  const accessToken = tokenUtils.getAccessToken(jwtPayload);
  const refreshToken = tokenUtils.getRefreshToken(jwtPayload);

  return { accessToken, refreshToken, userData };
};

const createGoogleHandoffCode = (userId: string) =>
  oauthCodeUtils.createHandoffCode(userId);

const exchangeGoogleCode = async (code: string) => {
  const userId = oauthCodeUtils.consumeHandoffCode(code);
  return googleOAuthLogin({ id: userId });
};

const refreshTokens = async (refreshToken: string) => {
  const verified = jwtUtils.verifyToken(
    refreshToken,
    envVars.REFRESH_TOKEN_SECRET,
  );

  if (!verified.success) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Invalid or expired refresh token.",
    );
  }

  const { id } = verified.data as JwtPayload;
  if (typeof id !== "string" || !id) {
    throw new AppError(status.UNAUTHORIZED, "Invalid refresh token.");
  }

  const userData = await prisma.user.findUnique({
    where: { id },
    omit: { password: true },
  });

  if (!userData) {
    throw new AppError(status.UNAUTHORIZED, "User not found.");
  }

  if (userData.status === UserStatus.BANNED) {
    throw new AppError(
      status.FORBIDDEN,
      "Your account has been banned. Please contact support.",
    );
  }

  const jwtPayload = {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    role: userData.role,
  };

  return {
    accessToken: tokenUtils.getAccessToken(jwtPayload),
    refreshToken: tokenUtils.getRefreshToken(jwtPayload),
  };
};

export const authService = {
  registerUser,
  loginUser,
  getMe,
  updateAvatar,
  googleOAuthLogin,
  createGoogleHandoffCode,
  exchangeGoogleCode,
  refreshTokens,
};
