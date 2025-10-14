import {
  connectMongo,
  disconnectMongo,
  getCollection,
} from "../src/services/database.js";
import "../src/config/env.js";

interface TechnologySeed {
  name: string;
  slug: string;
  judge0_language_key: string;
  aliases: string[];
  levels: string[];
}

const technologies: TechnologySeed[] = [
  {
    name: "JavaScript",
    slug: "javascript",
    judge0_language_key: "javascript",
    aliases: ["js", "node"],
    levels: ["beginner", "intermediate", "advanced"],
  },
  {
    name: "Python",
    slug: "python",
    judge0_language_key: "python3",
    aliases: ["py"],
    levels: ["beginner", "intermediate", "advanced"],
  },
  {
    name: "TypeScript",
    slug: "typescript",
    judge0_language_key: "typescript",
    aliases: ["ts"],
    levels: ["beginner", "intermediate"],
  },
];

async function main() {
  await connectMongo();
  const collection = getCollection<
    TechnologySeed & { createdAt: Date; updatedAt: Date }
  >("technologies");

  for (const tech of technologies) {
    await collection.updateOne(
      { slug: tech.slug },
      {
        $setOnInsert: {
          ...tech,
          createdAt: new Date(),
        },
        $set: {
          aliases: tech.aliases,
          judge0_language_key: tech.judge0_language_key,
          levels: tech.levels,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
}

main()
  .then(() => {
    console.log("Seed data applied successfully");
  })
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongo();
  });
