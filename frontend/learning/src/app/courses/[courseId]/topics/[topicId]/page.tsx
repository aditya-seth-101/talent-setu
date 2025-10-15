import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { fetchCurrentUser } from "@/lib/server-auth";
import type { TopicLearningView } from "@/types/api";
import {
  formatProgressStatus,
  progressStatusClasses,
} from "../../../status-utils";
import { GateChallengePanel } from "./gate-challenge-panel";

export default async function TopicWorkspacePage({
  params,
}: {
  params: { courseId: string; topicId: string };
}) {
  const session = await fetchCurrentUser();

  if (!session) {
    redirect(
      `/login?from=/courses/${params.courseId}/topics/${params.topicId}`
    );
  }

  const response = await apiRequest(
    `/api/learning/courses/${params.courseId}/topics/${params.topicId}`
  );

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Failed to load topic workspace (${response.status})`);
  }

  const view = (await response.json()) as TopicLearningView;
  const { course, topic, progress, prerequisites, hintPolicy } = view;
  const gateChallenge =
    view.gateChallenge ??
    topic.challenges.find((challenge) => challenge.id === view.gateChallengeId);
  const locked = progress.status === "locked";

  return (
    <div className="space-y-8">
      <nav className="text-sm text-zinc-500">
        <Link
          href="/courses"
          className="text-zinc-500 transition hover:text-indigo-600"
        >
          Courses
        </Link>
        <span className="mx-2 text-zinc-400">/</span>
        <Link
          href={`/courses/${course.id}`}
          className="text-zinc-500 transition hover:text-indigo-600"
        >
          {course.title}
        </Link>
        <span className="mx-2 text-zinc-400">/</span>
        <span className="text-zinc-700">{topic.title}</span>
      </nav>

      <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-500">
              Level {topic.level}
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-zinc-900">
              {topic.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-600">
              {topic.description}
            </p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            <div className="font-semibold">Topic status</div>
            <div className="mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold text-indigo-600">
              {formatProgressStatus(progress.status)}
            </div>
            <div className="mt-2 text-xs text-indigo-600">
              Attempts {progress.attempts} • Hints used {progress.hintsUsed}
            </div>
            <div className="mt-1 text-xs text-indigo-500">
              Remaining hints {progress.remainingHints}
            </div>
          </div>
        </div>
      </header>

      {locked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {progress.lockedReason ??
            "Complete prerequisites and earlier levels to unlock this topic."}
        </div>
      ) : null}

      {prerequisites.length > 0 ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-zinc-800">
            Prerequisites
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Finish these topics first if any are still locked.
          </p>
          <ul className="mt-4 space-y-3">
            {prerequisites.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3"
              >
                <span className="text-sm font-medium text-zinc-800">
                  {item.title}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${progressStatusClasses(
                    item.status
                  )}`}
                >
                  {formatProgressStatus(item.status)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <GateChallengePanel
        topicId={params.topicId}
        challengeId={view.gateChallengeId}
        challenge={gateChallenge}
        progress={progress}
        hintPolicy={hintPolicy}
        disabled={locked}
      />

      {topic.youtubeLink ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-zinc-800">
            Lesson video
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Watch this walkthrough before attempting the gate challenge.
          </p>
          <div className="relative mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 pt-[56.25%]">
            <iframe
              src={topic.youtubeLink}
              title={`${topic.title} lesson`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      ) : null}

      {topic.challenges.length > 0 ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-zinc-800">
            Practice challenges
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Use these challenges to reinforce the topic after clearing the gate.
          </p>
          <ul className="mt-4 space-y-3">
            {topic.challenges.map((challenge) => (
              <li
                key={challenge.id}
                className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide text-zinc-500">
                  <span>Type: {challenge.type}</span>
                  <span>Difficulty: {challenge.difficulty}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap leading-relaxed">
                  {challenge.prompt}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
