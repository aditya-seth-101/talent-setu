"use server";

import "server-only";
import { apiRequest } from "@/lib/api-client";
import { fetchCurrentUser } from "@/lib/server-auth";
import type { CourseLearningView, HintResponse } from "@/types/api";

type JudgeSubmissionResponse = {
  attempt: {
    id: string;
    status: string;
    token?: string;
    result?: Record<string, unknown>;
  };
};

type JudgeAttemptResponse = JudgeSubmissionResponse;

async function ensureSession() {
  const session = await fetchCurrentUser();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function callApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiRequest(path, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      safeParseError(text) ?? `Request failed with status ${response.status}`
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  const body = (await response.json()) as T;
  return body;
}

function safeParseError(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "message" in parsed) {
      return String(parsed.message);
    }
  } catch {
    // ignore
  }
  return raw ? raw : null;
}

export async function createJudgeSubmissionAction(payload: {
  challengeId?: string;
  languageId: number;
  sourceCode: string;
  stdin?: string;
  expectedOutput?: string;
}) {
  await ensureSession();

  const body = await callApi<JudgeSubmissionResponse>(
    "/api/judge/submissions",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return body;
}

export async function getJudgeSubmissionAction(attemptId: string) {
  await ensureSession();
  const body = await callApi<JudgeAttemptResponse>(
    `/api/judge/submissions/${attemptId}`,
    { method: "GET" }
  );
  return body;
}

export async function completeTopicGateAction(
  topicId: string,
  payload: {
    gateChallengeId?: string;
    attemptId?: string;
    passed: boolean;
    score?: number;
  }
): Promise<CourseLearningView> {
  await ensureSession();
  const body = await callApi<CourseLearningView>(
    `/api/learning/topics/${topicId}/complete`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return body;
}

export async function requestHintAction(
  challengeId: string,
  payload: {
    attemptId?: string;
    code?: string;
    stdout?: string;
    stderr?: string;
    message?: string;
  }
): Promise<HintResponse> {
  await ensureSession();
  const body = await callApi<HintResponse>(
    `/api/learning/challenges/${challengeId}/hints`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return body;
}
