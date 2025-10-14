import axios from "axios";
import type { AxiosInstance } from "axios";
import { env } from "../config/env.js";

let client: AxiosInstance | null = null;

export function getJudgeClient(): AxiosInstance {
  if (client) return client;

  client = axios.create({
    baseURL: env.JUDGE0_BASE_URL,
    headers: env.JUDGE0_API_KEY
      ? {
          "X-RapidAPI-Key": env.JUDGE0_API_KEY,
          "Content-Type": "application/json",
        }
      : { "Content-Type": "application/json" },
  });

  return client;
}

export type SubmissionRequest = {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  callback_url?: string;
};

export async function createSubmission(payload: SubmissionRequest) {
  const client = getJudgeClient();
  const body: SubmissionRequest = { ...payload };

  if (!body.callback_url && env.CALLBACK_BASE_URL) {
    body.callback_url = env.CALLBACK_BASE_URL;
  }

  const { data } = await client.post("/submissions", body);
  return data;
}

export async function getSubmission(token: string) {
  const client = getJudgeClient();
  const { data } = await client.get(`/submissions/${token}`);
  return data;
}
