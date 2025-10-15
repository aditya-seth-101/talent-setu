"use client";

import { useState, useEffect, useRef } from "react";
import { MonacoWrapper } from "@/components/monaco-wrapper";
import { API_BASE_URL } from "@/lib/constants";

export default function SampleEditorPage() {
  const [code, setCode] = useState<string>(
    `function greet(name){ return ` +
      "`Hello, ${name}!`" +
      ` } console.log(greet('World'))`
  );
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  async function runCode() {
    setRunning(true);
    setOutput(null);
    setStatus("submitting");
    try {
      const res = await fetch(`${API_BASE_URL}/api/judge/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceCode: code,
          languageId: 63, // JavaScript
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setOutput(body?.message ?? `Judge request failed: ${res.status}`);
        setRunning(false);
        setStatus("error");
        return;
      }

      const data = await res.json();
      const id = data.attempt?.id ?? data.attemptId ?? data.id ?? null;
      // if server returns attempt object
      const token = data.attempt?.id || data.attempt?.id || id;
      setAttemptId(token);
      setStatus("queued");

      // start polling
      pollRef.current = window.setInterval(() => {
        pollAttempt(token);
      }, 1500);
    } catch (err) {
      setOutput((err as Error).message);
      setStatus("error");
    } finally {
      setRunning(false);
    }
  }

  async function pollAttempt(id: string | null) {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/judge/submissions/${id}`);
      if (!res.ok) {
        // stop polling on 404/401
        if (res.status === 404 || res.status === 401) {
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setStatus("not_found");
          return;
        }
        return;
      }

      const data = await res.json();
      const attempt = data.attempt ?? data;
      setStatus(attempt.status ?? "processing");

      if (attempt.result) {
        setOutput(JSON.stringify(attempt.result, null, 2));
      }

      if (attempt.status === "completed" || attempt.status === "failed") {
        if (pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch (err) {
      console.error("Polling failed", err);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sample Monaco editor</h1>
      <MonacoWrapper
        language="javascript"
        value={code}
        onChange={(v) => setCode(v)}
        onRun={runCode}
      />

      <div>
        <h2 className="text-lg font-medium">Status</h2>
        <div className="rounded bg-zinc-100 p-3 text-sm">
          {status ?? "idle"}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium">Result / Output</h2>
        <pre className="rounded bg-zinc-100 p-3 text-sm">
          {output ?? "<no output>"}
        </pre>
      </div>

      <div>
        <button
          className="inline-flex items-center rounded bg-indigo-600 px-3 py-2 text-sm text-white"
          onClick={runCode}
          disabled={running}
        >
          {running ? "Submitting…" : "Run in Judge"}
        </button>
      </div>
    </div>
  );
}
