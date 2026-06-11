import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/api-error.js";
import type { RegisterInput, LoginInput, AuthResponse, TokenPair } from "./auth.types.js";

// Security: warn if JWT secret is weak or default
if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || env.JWT_SECRET.includes("your-jwt-secret")) {
  console.warn("[auth] JWT_SECRET is weak or using default value. Generate a strong random secret (32+ chars) for production.");
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw ApiError.conflict("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
      },
    });

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw ApiError.unauthorized("Invalid credentials");
    }

    const validPassword = await bcrypt.compare(input.password, user.password);

    if (!validPassword) {
      throw ApiError.unauthorized("Invalid credentials");
    }

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const token = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!token) {
      throw ApiError.unauthorized("Invalid refresh token");
    }

    if (token.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: token.id } });
      throw ApiError.unauthorized("Refresh token expired");
    }

    const accessToken = jwt.sign(
      { userId: token.user.id, email: token.user.email, role: token.user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
    );

    return { accessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  private generateTokens(payload: { userId: string; email: string; role: string }): TokenPair {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as SignOptions);

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    } as SignOptions);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }
}
