"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { completeTopicGateAction, requestHintAction } from "@/actions/learning";
import type {
  HintResponse,
  PublicChallenge,
  TopicLearningView,
} from "@/types/api";
import {
  formatProgressStatus,
  progressStatusClasses,
} from "../../../status-utils";

type GateChallengePanelProps = {
  topicId: string;
  challengeId?: string;
  challenge?: PublicChallenge;
  progress: TopicLearningView["progress"];
  hintPolicy: TopicLearningView["hintPolicy"];
  disabled?: boolean;
};

type HintLogEntry = HintResponse & { requestedAt: string };

export function GateChallengePanel({
  topicId,
  challengeId,
  challenge,
  progress,
  hintPolicy,
  disabled,
}: GateChallengePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hintError, setHintError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [hintHistory, setHintHistory] = useState<HintLogEntry[]>([]);
  const [hintStats, setHintStats] = useState({
    hintsUsed: progress.hintsUsed,
    hintPenalty: progress.hintPenalty,
    remainingHints: progress.remainingHints,
  });

  const isLocked = disabled || progress.status === "locked";
  const resolvedChallengeId = challengeId ?? challenge?.id;

  function handleRequestHint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resolvedChallengeId) {
      setHintError("No gate challenge available for this topic.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const message = String(formData.get("message") ?? "").trim();
    event.currentTarget.reset();

    startTransition(async () => {
      try {
        setHintError(null);
        const result = await requestHintAction(resolvedChallengeId, {
          message: message.length > 0 ? message : undefined,
        });
        setHintHistory((prev) => [
          { ...result, requestedAt: new Date().toISOString() },
          ...prev,
        ]);
        setHintStats({
          hintsUsed: result.progress.hintsUsed,
          hintPenalty: result.progress.hintPenalty,
          remainingHints: result.remainingHints,
        });
        setActionMessage("Hint requested successfully.");
      } catch (error) {
        const messageFromError =
          error instanceof Error ? error.message : "Unable to request hint.";
        setHintError(messageFromError);
        setActionMessage(null);
      }
    });
  }

  function recordAttempt(passed: boolean) {
    startTransition(async () => {
      try {
        setHintError(null);
        const payload = resolvedChallengeId
          ? { gateChallengeId: resolvedChallengeId, passed }
          : { passed };
        await completeTopicGateAction(topicId, payload);
        setActionMessage(
          passed ? "Topic marked as completed." : "Attempt recorded."
        );
        router.refresh();
      } catch (error) {
        const messageFromError =
          error instanceof Error ? error.message : "Unable to record attempt.";
        setHintError(messageFromError);
        setActionMessage(null);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">
            Gate challenge
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Clear this challenge to unlock the next topics and earn XP.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${progressStatusClasses(
            progress.status
          )}`}
        >
          {formatProgressStatus(progress.status)}
        </span>
      </div>

      {challenge ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-700">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide text-zinc-500">
              <span>Type: {challenge.type}</span>
              <span>Difficulty: {challenge.difficulty}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
              {challenge.prompt}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700">
              <div className="font-semibold">Hint policy</div>
              <ul className="mt-2 space-y-1 text-xs text-indigo-600">
                <li>
                  Max {hintPolicy.maxPerChallenge} hint
                  {hintPolicy.maxPerChallenge === 1 ? "" : "s"} per challenge
                </li>
                <li>
                  Cooldown {hintPolicy.cooldownSeconds} seconds between hints
                </li>
                <li>
                  Penalty −{hintPolicy.penaltyPerStatic} XP for static hints
                </li>
                <li>Penalty −{hintPolicy.penaltyPerAi} XP for AI hints</li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
              <div className="font-semibold">Your progress</div>
              <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                <li>
                  {progress.attempts} attempt
                  {progress.attempts === 1 ? "" : "s"}
                </li>
                <li>
                  {hintStats.hintsUsed} hint
                  {hintStats.hintsUsed === 1 ? "" : "s"} used
                </li>
                <li>Hint penalty {hintStats.hintPenalty}</li>
                <li>
                  {hintStats.remainingHints} hint
                  {hintStats.remainingHints === 1 ? "" : "s"} remaining
                </li>
              </ul>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <form
              onSubmit={handleRequestHint}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-zinc-800">
                  Request a hint
                </div>
                <span className="text-xs text-zinc-500">
                  Remaining {hintStats.remainingHints}
                </span>
              </div>
              <label className="text-xs font-medium text-zinc-600">
                Share what you tried (optional)
              </label>
              <textarea
                name="message"
                placeholder="Describe your latest attempt or where you are stuck"
                className="h-24 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                disabled={isLocked || isPending}
              />
              <button
                type="submit"
                disabled={
                  isLocked || isPending || hintStats.remainingHints <= 0
                }
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {isPending ? "Requesting..." : "Get hint"}
              </button>
              <p className="text-xs text-zinc-500">
                Hints reduce XP; try debugging before requesting another.
              </p>
            </form>

            <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4">
              <div className="text-sm font-semibold text-zinc-800">
                Record attempt
              </div>
              <p className="text-xs text-zinc-600">
                Mark the result of your latest submission to update progress.
              </p>
              <div className="flex flex-col gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => recordAttempt(true)}
                  disabled={isLocked || isPending}
                  className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {isPending ? "Saving..." : "I passed the gate"}
                </button>
                <button
                  type="button"
                  onClick={() => recordAttempt(false)}
                  disabled={isLocked || isPending}
                  className="inline-flex items-center justify-center rounded-md border border-zinc-200 px-3 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:text-zinc-400"
                >
                  {isPending ? "Saving..." : "Mark attempt (failed)"}
                </button>
              </div>
              <p className="text-xs text-zinc-500">
                Completing the gate grants XP and unlocks downstream topics.
              </p>
            </div>
          </div>

          {(hintError || actionMessage) && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
              {hintError ? (
                <p className="text-zinc-600">
                  <span className="font-semibold text-rose-600">Issue:</span>{" "}
                  {hintError}
                </p>
              ) : null}
              {actionMessage ? (
                <p className="text-zinc-600">
                  <span className="font-semibold text-emerald-600">
                    Update:
                  </span>{" "}
                  {actionMessage}
                </p>
              ) : null}
            </div>
          )}

          {hintHistory.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-zinc-800">
                Hint history
              </div>
              <ul className="space-y-3">
                {hintHistory.map((entry, index) => (
                  <li
                    key={entry.requestedAt + index}
                    className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                      <span>
                        {new Date(entry.requestedAt).toLocaleString()} •{" "}
                        {entry.source.toUpperCase()} hint
                      </span>
                      <span>
                        Penalty −{entry.penaltyApplied} XP • Remaining{" "}
                        {entry.remainingHints}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed">
                      {entry.hint}
                    </p>
                    {entry.followUps.length > 0 ? (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-zinc-600">
                        {entry.followUps.map((followUp, followIndex) => (
                          <li key={followIndex}>{followUp}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-sm text-zinc-600">
          This topic does not have a gate challenge yet. Review the lessons and
          mark your learning manually via the course page once available.
        </p>
      )}
    </section>
  );
}
