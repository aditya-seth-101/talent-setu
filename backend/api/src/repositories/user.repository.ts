import type { Collection, ObjectId, OptionalUnlessRequiredId } from "mongodb";
import { ObjectId as MongoObjectId } from "mongodb";
import type { CreateUserInput, UserDocument } from "../models/user.model.js";
import { getCollection } from "../services/database.js";

function usersCollection(): Collection<UserDocument> {
  return getCollection<UserDocument>("users");
}

export async function createUser(
  input: CreateUserInput
): Promise<UserDocument> {
  const now = new Date();
  const doc: Omit<UserDocument, "_id"> = {
    email: input.email,
    passwordHash: input.passwordHash,
    roles: input.roles,
    createdAt: now,
    updatedAt: now,
    emailVerified: false,
  };

  const result = await usersCollection().insertOne(
    doc as OptionalUnlessRequiredId<UserDocument>
  );

  return {
    _id: result.insertedId,
    ...doc,
  };
}

export async function findUserByEmail(
  email: string
): Promise<UserDocument | null> {
  return usersCollection().findOne({ email });
}

export async function findUserById(
  id: string | ObjectId
): Promise<UserDocument | null> {
  const objectId = typeof id === "string" ? new MongoObjectId(id) : id;
  return usersCollection().findOne({ _id: objectId });
}

export async function findUsersByIds(
  ids: Array<string | ObjectId>
): Promise<UserDocument[]> {
  if (!ids.length) {
    return [];
  }

  const objectIds = ids.map((value) =>
    typeof value === "string" ? new MongoObjectId(value) : value
  );

  return usersCollection()
    .find({ _id: { $in: objectIds } })
    .toArray();
}

export async function updateUserLoginTimestamp(id: ObjectId): Promise<void> {
  await usersCollection().updateOne(
    { _id: id },
    { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
  );
}

export async function markUserEmailVerified(id: ObjectId): Promise<void> {
  await usersCollection().updateOne(
    { _id: id },
    { $set: { emailVerified: true, updatedAt: new Date() } }
  );
}
