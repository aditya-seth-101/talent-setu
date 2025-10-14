import type { ObjectId } from "mongodb";
import type { Role } from "../middleware/rbac.js";

export interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  emailVerified: boolean;
}

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  roles: Role[];
};

export type PublicUser = {
  id: string;
  email: string;
  roles: Role[];
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
};

export function mapUserToPublic(user: UserDocument): PublicUser {
  return {
    id: user._id.toHexString(),
    email: user.email,
    roles: user.roles,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString(),
  };
}
