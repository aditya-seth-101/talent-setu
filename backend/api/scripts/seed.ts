import {
  connectMongo,
  disconnectMongo,
  getCollection,
} from "../src/services/database.js";
import "../src/config/env.js";
import type { Role } from "../src/middleware/rbac.js";

interface TechnologySeed {
  name: string;
  slug: string;
  judge0_language_key: string;
  aliases: string[];
  levels: string[];
}

interface RoleSeed {
  slug: Role;
  name: string;
  description: string;
  assignable: boolean;
  permissions: string[];
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

  const rolesCollection = getCollection<
    RoleSeed & { createdAt: Date; updatedAt: Date }
  >("roles");

  const roles: RoleSeed[] = [
    {
      slug: "student",
      name: "Student",
      description:
        "Learners exploring courses, exercises, and assessments on the platform",
      assignable: true,
      permissions: ["courses.enroll", "profiles.self"],
    },
    {
      slug: "recruiter",
      name: "Recruiter",
      description:
        "Talent partners who create assessments and review candidate progress",
      assignable: true,
      permissions: ["assessments.manage", "profiles.search", "profiles.view"],
    },
    {
      slug: "proctor",
      name: "Proctor",
      description:
        "Trusted users who invigilate high-stakes assessments and kiosks",
      assignable: false,
      permissions: [
        "assessments.proctor",
        "assessments.verify",
        "profiles.view",
      ],
    },
    {
      slug: "admin",
      name: "Administrator",
      description:
        "Platform staff who manage technologies, users, assessments, and analytics",
      assignable: false,
      permissions: [
        "admin.manage",
        "technologies.manage",
        "users.manage",
        "assessments.manage",
      ],
    },
  ];

  for (const role of roles) {
    await rolesCollection.updateOne(
      { slug: role.slug },
      {
        $setOnInsert: {
          createdAt: new Date(),
        },
        $set: {
          name: role.name,
          description: role.description,
          assignable: role.assignable,
          permissions: role.permissions,
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
