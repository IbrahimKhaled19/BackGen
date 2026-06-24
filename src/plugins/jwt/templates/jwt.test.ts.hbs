import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Mock dependencies
vi.mock("../../config/database.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("../../config/env.js", () => ({
  env: {
    JWT_SECRET: "test-secret-that-is-at-least-32-chars-long-for-security!",
    JWT_REFRESH_SECRET: "test-refresh-secret-that-is-at-least-32-chars!",
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
  },
}));

import { AuthService } from "./auth.service.js";
import { prisma } from "../../config/database.js";
import type { RegisterInput, LoginInput } from "./auth.types.js";

describe("AuthService", () => {
  let authService: AuthService;
  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    password: "$2a$10$hashedpassword",
    role: "USER",
    tokenVersion: 0,
    loginAttempts: 0,
    lockoutUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user and return tokens", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

      const input: RegisterInput = { email: "test@example.com", password: "StrongP@ss1" };
      const result = await authService.register(input);

      expect(result.user.email).toBe("test@example.com");
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(prisma.user.create).toHaveBeenCalledOnce();
    });

    it("should throw conflict on duplicate email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const input: RegisterInput = { email: "test@example.com", password: "StrongP@ss1" };
      await expect(authService.register(input)).rejects.toThrow("Email already exists");
    });
  });

  describe("login with account lockout", () => {
    it("should reject login when account is locked", async () => {
      const lockedUser = {
        ...mockUser,
        loginAttempts: 5,
        lockoutUntil: new Date(Date.now() + 600000),
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(lockedUser);

      const input: LoginInput = { email: "test@example.com", password: "any" };
      await expect(authService.login(input)).rejects.toThrow("Account locked");
    });

    it("should increment loginAttempts on bad password", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, loginAttempts: 1 });

      const input: LoginInput = { email: "test@example.com", password: "wrong" };
      await expect(authService.login(input)).rejects.toThrow("Invalid credentials");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ loginAttempts: 1 }),
        })
      );
    });

    it("should lock account after MAX_LOGIN_ATTEMPTS failed attempts", async () => {
      const nearLimitUser = { ...mockUser, loginAttempts: 4 };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(nearLimitUser);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...nearLimitUser,
        loginAttempts: 5,
        lockoutUntil: new Date(),
      });

      const input: LoginInput = { email: "test@example.com", password: "wrong" };
      await expect(authService.login(input)).rejects.toThrow("Invalid credentials");

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            loginAttempts: 5,
            lockoutUntil: expect.any(Date),
          }),
        })
      );
    });

    it("should reset loginAttempts on successful login", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, loginAttempts: 0, lockoutUntil: null });
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

      const input: LoginInput = { email: "test@example.com", password: "correct" };
      // Mock bcrypt.compare to return true
      vi.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

      const result = await authService.login(input);
      expect(result.accessToken).toBeTruthy();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ loginAttempts: 0, lockoutUntil: null }),
        })
      );
    });
  });

  describe("refresh token rotation", () => {
    it("should rotate refresh token on use", async () => {
      const oldToken = jwt.sign({ jti: "test-jti", sub: "user-1" }, "test-refresh-secret-that-is-at-least-32-chars!", {
        expiresIn: "7d",
        algorithm: "HS256",
      });

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: "rt-1",
        token: crypto.createHash("sha256").update(oldToken).digest("hex"),
        userId: "user-1",
        expiresAt: new Date(Date.now() + 86400000),
        user: mockUser,
      });
      vi.mocked(prisma.refreshToken.delete).mockResolvedValue({} as any);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

      const result = await authService.refresh(oldToken);

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      // Old token should be deleted (rotation)
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: "rt-1" } });
    });

    it("should reject already-consumed refresh token (rotation theft detection)", async () => {
      const consumedToken = jwt.sign(
        { jti: "consumed-jti", sub: "user-1" },
        "test-refresh-secret-that-is-at-least-32-chars!",
        { expiresIn: "7d", algorithm: "HS256" }
      );

      // Token JWT is valid but not found in DB (already consumed)
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.refreshToken.deleteMany).mockResolvedValue({ count: 0 });

      await expect(authService.refresh(consumedToken)).rejects.toThrow("Refresh token has been revoked");
    });
  });

  describe("token revocation via changePassword", () => {
    it("should increment tokenVersion and delete all refresh tokens", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, tokenVersion: 1 });
      vi.mocked(prisma.refreshToken.deleteMany).mockResolvedValue({ count: 3 });

      await authService.changePassword("user-1", "oldPass", "NewStr0ng!Pass");

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tokenVersion: { increment: 1 },
          }),
        })
      );
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    });

    it("should throw when current password is incorrect", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, "compare").mockResolvedValue(false as never);

      await expect(
        authService.changePassword("user-1", "wrongOldPass", "NewStr0ng!Pass")
      ).rejects.toThrow("Current password is incorrect");
    });

    it("should throw when user is not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        authService.changePassword("nonexistent", "oldPass", "NewStr0ng!Pass")
      ).rejects.toThrow("User not found");
    });
  });

  describe("algorithm confusion prevention", () => {
    it("should sign tokens with HS256 algorithm", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

      const input: RegisterInput = { email: "test@example.com", password: "StrongP@ss1" };
      const result = await authService.register(input);

      const accessHeader = jwt.decode(result.accessToken, { complete: true }) as { header: { alg: string } };
      const refreshHeader = jwt.decode(result.refreshToken, { complete: true }) as { header: { alg: string } };

      expect(accessHeader.header.alg).toBe("HS256");
      expect(refreshHeader.header.alg).toBe("HS256");
    });

    it("should reject tokens with alg:none during refresh", async () => {
      // Manually craft a JWT with alg: none (no signature) to bypass signature verification
      const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(JSON.stringify({ jti: "none-jti", sub: "user-1" })).toString("base64url");
      const noneAlgToken = `${header}.${payload}.`;

      // jwt.verify with { algorithms: ["HS256"] } must reject alg:none
      await expect(authService.refresh(noneAlgToken)).rejects.toThrow("Invalid or expired refresh token");
    });
  });

  describe("logout", () => {
    it("should delete refresh token on logout", async () => {
      const token = jwt.sign(
        { jti: "logout-jti", sub: "user-1" },
        "test-refresh-secret-that-is-at-least-32-chars!",
        { expiresIn: "7d", algorithm: "HS256" }
      );
      vi.mocked(prisma.refreshToken.deleteMany).mockResolvedValue({ count: 1 });

      await authService.logout(token);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledOnce();
    });
  });
});
