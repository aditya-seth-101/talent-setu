import type { Collection } from "mongodb";
import type { ObjectId } from "mongodb";
import type { Role } from "../middleware/rbac.js";
import type { RoleDocument } from "../models/role.model.js";
import { getCollection } from "../services/database.js";

function rolesCollection(): Collection<RoleDocument> {
  return getCollection<RoleDocument>("roles");
}

export async function findAllRoles(): Promise<RoleDocument[]> {
  return rolesCollection().find({}).sort({ assignable: -1, name: 1 }).toArray();
}

export async function findAssignableRoles(): Promise<RoleDocument[]> {
  return rolesCollection()
    .find({ assignable: true })
    .sort({ name: 1 })
    .toArray();
}

export async function findRolesBySlugs(slugs: Role[]): Promise<RoleDocument[]> {
  if (slugs.length === 0) {
    return [];
  }

  return rolesCollection()
    .find({ slug: { $in: slugs } })
    .toArray();
}

export async function createOrUpdateRole(role: {
  _id?: ObjectId;
  slug: Role;
  name: string;
  description?: string;
  assignable: boolean;
  permissions: string[];
}) {
  const now = new Date();
  await rolesCollection().updateOne(
    { slug: role.slug },
    {
      $setOnInsert: {
        createdAt: now,
      },
      $set: {
        name: role.name,
        description: role.description,
        assignable: role.assignable,
        permissions: role.permissions,
        updatedAt: now,
      },
    },
    { upsert: true }
  );
}
