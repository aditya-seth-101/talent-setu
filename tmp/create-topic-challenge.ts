#!/usr/bin/env tsx
import {
  connectMongo,
  disconnectMongo,
  getCollection,
} from "../backend/api/src/services/database.js";
import { ObjectId } from "mongodb";

async function main() {
  await connectMongo();
  const topics = getCollection("topics");
  const challenges = getCollection("challenges");
  const courses = getCollection("courses");

  const courseId = new ObjectId("68ef8ba24629180e775a1f8b");
  const now = new Date();

  const topicDoc = {
    courseId,
    title: "Console and Basics",
    slug: "console-and-basics",
    description: "Test topic",
    youtubeLink: "",
    prerequisites: [],
    level: "Beginner",
    editorTemplate: "console.log('hello')",
    challengeIds: [],
    createdAt: now,
    updatedAt: now,
  } as any;

  const tRes = await topics.insertOne(topicDoc);
  const topicId = tRes.insertedId;
  console.log("Inserted topic", topicId.toHexString());

  const chDoc = {
    topicId,
    type: "coding",
    difficulty: "beginner",
    prompt:
      "Write a function greet(name) that returns `Hello, ${name}!`. Log greeting for World.",
    judge0Spec: {
      languageId: 63,
      stdin: "",
      expectedOutput: "Hello, World!\n",
    },
    hints: [
      "Define function greet(name) that returns greeting",
      "Call console.log with greet('World')",
    ],
    createdAt: now,
    updatedAt: now,
  } as any;

  const cRes = await challenges.insertOne(chDoc);
  const challengeId = cRes.insertedId;
  console.log("Inserted challenge", challengeId.toHexString());

  await topics.updateOne(
    { _id: topicId },
    {
      $addToSet: { challengeIds: challengeId },
      $set: { updatedAt: new Date() },
    }
  );
  await courses.updateOne(
    { _id: courseId, "levels.name": "Beginner" },
    {
      $addToSet: { "levels.$.topicIds": topicId },
      $set: { updatedAt: new Date() },
    }
  );

  console.log("Linked challenge and topic to course");

  await disconnectMongo();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
