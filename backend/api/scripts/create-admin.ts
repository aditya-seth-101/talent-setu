#!/usr/bin/env node
import "../src/config/env.js";
import {
  connectMongo,
  disconnectMongo,
  getCollection,
} from "../src/services/database.js";
import { hashPassword, hashToken } from "../src/utils/password.js";
import { ObjectId } from "mongodb";
import { createTokenPair } from "../src/services/auth/token.service.js";
import { createSession } from "../src/repositories/session.repository.js";
import { env } from "../src/config/env.js";

async function main() {
  await connectMongo();

  const users = getCollection("users");
  const roles = getCollection("roles");

  const email = process.env.ADMIN_EMAIL ?? "admin@talent-setu.local";
  const password = process.env.ADMIN_PASSWORD ?? "AdminPass123!";

  const adminRole = await roles.findOne({ slug: "admin" });
  if (!adminRole) {
    console.warn(
      "Admin role not found in roles collection. Run seed.ts first."
    );
  }

  const existing = await users.findOne({ email });
  const passwordHash = await hashPassword(password);

  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      {
        $set: {
          passwordHash,
          roles: ["admin"],
          emailVerified: true,
          updatedAt: new Date(),
        },
      }
    );
    console.log(`Updated existing user to admin: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`UserId: ${existing._id.toHexString()}`);
    // create session + tokens
    const sessionId = new ObjectId();
    const tokens = createTokenPair({
      sub: existing._id.toHexString(),
      email,
      roles: ["admin"],
      sid: sessionId.toHexString(),
    });
    const tokenHash = await hashToken(tokens.refreshToken);
    const expiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    );
    await createSession({
      _id: sessionId,
      userId: existing._id,
      tokenHash,
      expiresAt,
    });
    console.log("Tokens:");
    console.log(tokens);
  } else {
    const now = new Date();
    const doc = {
      email,
      passwordHash,
      roles: ["admin"],
      createdAt: now,
      updatedAt: now,
      emailVerified: true,
    } as any;

    const result = await users.insertOne(doc);
    console.log(`Created admin user: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`UserId: ${result.insertedId.toHexString()}`);

    // create session + tokens
    const sessionId = new ObjectId();
    const tokens = createTokenPair({
      sub: result.insertedId.toHexString(),
      email,
      roles: ["admin"],
      sid: sessionId.toHexString(),
    });
    const tokenHash = await hashToken(tokens.refreshToken);
    const expiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    );
    await createSession({
      _id: sessionId,
      userId: result.insertedId,
      tokenHash,
      expiresAt,
    });
    console.log("Tokens:");
    console.log(tokens);
  }

  await disconnectMongo();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
