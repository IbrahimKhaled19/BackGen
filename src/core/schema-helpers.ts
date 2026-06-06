import * as path from "path";

/**
 * Get the path where plugin models should be written, per ORM.
 */
export function getPluginModelPath(orm: string, modelName: string): { dir: string; file: string } {
  switch (orm) {
    case "drizzle":
      return {
        dir: "src/db/schema",
        file: `src/db/schema/${modelName.toLocaleLowerCase()}.ts`,
      };
    case "mongoose":
      return {
        dir: "src/models",
        file: `src/models/${modelName.toLocaleLowerCase()}.model.ts`,
      };
    case "prisma":
    default:
      return {
        dir: "prisma",
        file: path.join("prisma", "schema.prisma"),
      };
  }
}

/**
 * Get the full User model snippet for a given ORM.
 * Used by plugin installers (e.g., JWT) to append User model to generated projects.
 */
export function getUserModelSnippet(orm: string): string {
  switch (orm) {
    case "drizzle":
      return `import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});`;
    case "mongoose":
      return `import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  name?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  role: { type: String, default: "user" },
}, { timestamps: true, collection: "users" });

export const User = mongoose.model<IUser>("User", UserSchema);`;
    case "prisma":
    default:
      return `model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  role      String   @default("user")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;
  }
}

/**
 * Get the full RefreshToken model snippet for a given ORM.
 */
export function getRefreshTokenModelSnippet(orm: string): string {
  switch (orm) {
    case "drizzle":
      return `import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { user } from "./user.js";

export const refreshToken = pgTable("refresh_token", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});`;
    case "mongoose":
      return `import mongoose, { Schema, Document } from "mongoose";

export interface IRefreshToken extends Document {
  _id: string;
  token: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  token: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, collection: "refresh_tokens" });

export const RefreshToken = mongoose.model<IRefreshToken>("RefreshToken", RefreshTokenSchema);`;
    case "prisma":
    default:
      return `model RefreshToken {
  id        String   @id @default(uuid())
  token     String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}`;
  }
}
