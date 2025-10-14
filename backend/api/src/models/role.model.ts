import type { ObjectId } from "mongodb";
import type { Role } from "../middleware/rbac.js";

export interface RoleDocument {
  _id: ObjectId;
  slug: Role;
  name: string;
  description?: string;
  assignable: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type PublicRole = {
  id: string;
  slug: Role;
  name: string;
  description: string | null;
  assignable: boolean;
};

export function mapRoleToPublic(role: RoleDocument): PublicRole {
  return {
    id: role._id.toHexString(),
    slug: role.slug,
    name: role.name,
    description: role.description ?? null,
    assignable: role.assignable,
  };
}
