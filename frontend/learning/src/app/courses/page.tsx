import Link from "next/link";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { fetchCurrentUser } from "@/lib/server-auth";
import type { ListCoursesResponse } from "@/types/api";

function summariseLevels(
  levels: ListCoursesResponse["courses"][number]["levels"]
) {
  return levels
    .map((level) => `${level.name} (${level.topicCount})`)
    .join(" • ");
}

export default async function CoursesPage() {
  const session = await fetchCurrentUser();

  if (!session) {
    redirect("/login?from=/courses");
  }

  const response = await apiRequest("/api/courses");
  if (!response.ok) {
    throw new Error(`Failed to load courses (${response.status})`);
  }

  const data = (await response.json()) as ListCoursesResponse;
  const courses = data.courses ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-zinc-900">Learning paths</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Choose a course to unlock topics, practice gate challenges, and earn
          leaderboard points.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {course.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {course.description ?? "AI generated learning path"}
                </p>
              </div>
              <div className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                {course.languageKey}
              </div>
            </div>
            <dl className="mt-4 space-y-1 text-sm text-zinc-600">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">Levels</dt>
                <dd className="font-medium text-zinc-800">
                  {summariseLevels(course.levels)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">Status</dt>
                <dd className="font-medium text-zinc-800">
                  {course.status === "published" ? "Available" : "Draft"}
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-sm font-medium text-indigo-600">
              View topics &rarr;
            </p>
          </Link>
        ))}
        {courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
            No published courses yet. Check back soon.
          </div>
        ) : null}
      </div>
    </div>
  );
}
