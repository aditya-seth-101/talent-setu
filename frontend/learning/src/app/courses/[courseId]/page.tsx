import Link from "next/link";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { fetchCurrentUser } from "@/lib/server-auth";
import type { CourseLearningView, TopicProgressView } from "@/types/api";
import { formatProgressStatus, progressStatusClasses } from "../status-utils";

export default async function CourseDetailPage({
  params,
}: {
  params: { courseId: string };
}) {
  const session = await fetchCurrentUser();

  if (!session) {
    redirect(`/login?from=/courses/${params.courseId}`);
  }

  const response = await apiRequest(`/api/learning/courses/${params.courseId}`);
  if (!response.ok) {
    throw new Error(`Failed to load course progress (${response.status})`);
  }

  const view = (await response.json()) as CourseLearningView;
  const { course, totals } = view;

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-500">
              Learning path
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-zinc-900">
              {course.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              {course.description ?? "AI generated content"}
            </p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            <div className="font-semibold">XP</div>
            <div className="mt-1 text-lg">{totals.netXp.toLocaleString()}</div>
            <div className="mt-1 text-xs text-indigo-600">
              Base {totals.baseXp.toLocaleString()} − Penalties{" "}
              {totals.hintPenalty.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-indigo-500">
              {totals.completedTopics} topic
              {totals.completedTopics === 1 ? "" : "s"} completed
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-6">
        {view.levels.map((level) => (
          <div
            key={level.name}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">
                  {level.name}
                </h2>
                <p className="text-sm text-zinc-600">
                  {level.topics.length} topics •{" "}
                  {formatProgressStatus(
                    level.status as TopicProgressView["status"]
                  )}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${progressStatusClasses(
                  level.status as TopicProgressView["status"]
                )}`}
              >
                {formatProgressStatus(
                  level.status as TopicProgressView["status"]
                )}
              </span>
            </div>

            <ul className="mt-6 space-y-4">
              {level.topics.map(({ summary, progress }) => {
                const locked = progress.status === "locked";
                const href = `/courses/${course.id}/topics/${summary.id}`;

                return (
                  <li
                    key={summary.id}
                    className="rounded-xl border border-zinc-200 p-5 transition hover:border-indigo-200"
                  >
                    <div className="flex flex-wrap justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-900">
                          {summary.title}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-600">
                          {summary.description}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {summary.challengeCount} challenge
                          {summary.challengeCount === 1 ? "" : "s"} • Level{" "}
                          {summary.level}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-xs text-zinc-600">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${progressStatusClasses(
                            progress.status
                          )}`}
                        >
                          {formatProgressStatus(progress.status)}
                        </span>
                        <span>
                          {progress.attempts} attempt
                          {progress.attempts === 1 ? "" : "s"}
                        </span>
                        <span>
                          {progress.hintsUsed} hint
                          {progress.hintsUsed === 1 ? "" : "s"} used
                        </span>
                        <span>Penalty {progress.hintPenalty}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600">
                      <span>
                        {progress.remainingHints} hint
                        {progress.remainingHints === 1 ? "" : "s"} remaining for
                        the gate challenge
                      </span>
                      {locked ? (
                        <span className="text-xs text-zinc-500">
                          {progress.lockedReason ??
                            "Complete prerequisites to unlock this topic."}
                        </span>
                      ) : (
                        <Link
                          href={href}
                          className="inline-flex items-center rounded-md border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                        >
                          Open workspace →
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
