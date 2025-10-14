import type { Role } from "../../middleware/rbac.js";
import { BadRequestError } from "../../utils/http-errors.js";
import {
  findAllRoles,
  findAssignableRoles,
  findRolesBySlugs,
} from "../../repositories/role.repository.js";
import { mapRoleToPublic } from "../../models/role.model.js";

const ADMIN_ONLY_ROLES: Role[] = ["admin", "proctor"];

export async function listPublicRoles() {
  const roles = await findAllRoles();
  return roles.map(mapRoleToPublic);
}

export async function listAssignableRoles() {
  const roles = await findAssignableRoles();
  return roles.map(mapRoleToPublic);
}

export async function validateSelfAssignableRoles(
  requested: Role[]
): Promise<Role[]> {
  const uniqueRoles = Array.from(new Set(requested));

  if (uniqueRoles.length === 0) {
    return ["student"];
  }

  const roles = await findRolesBySlugs(uniqueRoles);
  const foundSlugs = new Set(roles.map((role) => role.slug));

  const missingRoles = uniqueRoles.filter((role) => !foundSlugs.has(role));
  if (missingRoles.length > 0) {
    throw new BadRequestError(
      `Unknown roles requested: ${missingRoles.join(", ")}`
    );
  }

  const notAssignable = roles
    .filter((role) => !role.assignable)
    .map((role) => role.slug);

  if (notAssignable.length > 0) {
    throw new BadRequestError(
      `You cannot self-assign these roles: ${notAssignable.join(", ")}`
    );
  }

  const adminRolesRequested = uniqueRoles.filter((role) =>
    ADMIN_ONLY_ROLES.includes(role)
  );

  if (adminRolesRequested.length > 0) {
    throw new BadRequestError(
      "Admin or proctor roles require manual assignment by staff"
    );
  }

  return uniqueRoles;
}
