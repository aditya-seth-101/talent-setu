#!/usr/bin/env tsx
import {
  connectMongo,
  disconnectMongo,
  getCollection,
} from "../backend/api/src/services/database.js";

async function main() {
  await connectMongo();
  const coll = getCollection("technologies");
  const technologies = [
    {
      name: "JavaScript",
      slug: "javascript",
      judge0_language_key: "javascript",
      judge0_language_id: 63,
      aliases: ["js", "node"],
      levels: ["beginner", "intermediate", "advanced"],
    },
    {
      name: "Python",
      slug: "python",
      judge0_language_key: "python3",
      judge0_language_id: 71,
      aliases: ["py"],
      levels: ["beginner", "intermediate", "advanced"],
    },
  ];

  for (const tech of technologies) {
    await coll.replaceOne(
      { slug: tech.slug },
      { ...tech, createdAt: new Date(), updatedAt: new Date() },
      { upsert: true }
    );
    console.log("Upserted", tech.slug);
  }

  await disconnectMongo();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
