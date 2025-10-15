"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/constants";

export default function AdminPage() {
  const [courses, setCourses] = useState<unknown[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [topics, setTopics] = useState<unknown[]>([]);

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [languageKey, setLanguageKey] = useState("javascript");

  const [topicTitle, setTopicTitle] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [topicLevel, setTopicLevel] = useState("Beginner");

  const [challengePrompt, setChallengePrompt] = useState("");
  const [challengeLanguageId, setChallengeLanguageId] = useState(63);
  const [message, setMessage] = useState<string | null>(null);

  async function loadCourses() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/courses`);
      if (!res.ok) return;
      const data = await res.json();
      setCourses(data.courses ?? []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadTopicsForCourse(courseId: string) {
    try {
      // fetch course detail and topics
      const res = await fetch(`${API_BASE_URL}/api/courses/${courseId}`);
      if (!res.ok) return;
      const data = await res.json();
      const course = data.course;
      setTopics(course.topics ?? []);
    } catch (err) {
      console.error(err);
    }
  }

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title, languageKey }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body?.message ?? "Failed to create course");
        return;
      }
      setMessage("Course created");
      loadCourses();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function createTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourse) return setMessage("Select a course");
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse,
          title: topicTitle,
          slug: topicSlug,
          description: topicDescription,
          level: topicLevel,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body?.message ?? "Failed to create topic");
        return;
      }
      setMessage("Topic created");
      loadTopicsForCourse(selectedCourse);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function createChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!topics[0]) return setMessage("Select a topic");
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: topics[0].id,
          type: "coding",
          difficulty: "beginner",
          prompt: challengePrompt,
          judge0Spec: { languageId: Number(challengeLanguageId) },
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body?.message ?? "Failed to create challenge");
        return;
      }
      setMessage("Challenge created");
      loadTopicsForCourse(selectedCourse!);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  // initial load
  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) loadTopicsForCourse(selectedCourse);
  }, [selectedCourse]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin — Minimal</h1>

      <section className="rounded border p-4 bg-white">
        <h2 className="font-semibold">Create course</h2>
        <form onSubmit={createCourse} className="space-y-2 mt-2">
          <input
            placeholder="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="rounded border px-2 py-1"
          />
          <input
            placeholder="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded border px-2 py-1"
          />
          <input
            placeholder="languageKey"
            value={languageKey}
            onChange={(e) => setLanguageKey(e.target.value)}
            className="rounded border px-2 py-1"
          />
          <div>
            <button className="inline-flex items-center rounded bg-indigo-600 px-3 py-2 text-sm text-white">
              Create
            </button>
          </div>
        </form>
      </section>

      <section className="rounded border p-4 bg-white">
        <h2 className="font-semibold">Courses</h2>
        <ul className="mt-2 space-y-2">
          {courses.map((c) => (
            <li key={c.id} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-sm text-zinc-500">{c.slug}</div>
              </div>
              <div>
                <button
                  onClick={() => setSelectedCourse(c.id)}
                  className="text-sm text-indigo-600"
                >
                  Select
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {selectedCourse ? (
        <section className="rounded border p-4 bg-white">
          <h2 className="font-semibold">Topics for selected course</h2>
          <ul className="mt-2 space-y-2">
            {topics.map((t) => (
              <li key={t.id} className="font-medium">
                {t.title}
              </li>
            ))}
          </ul>

          <h3 className="mt-4 font-semibold">Create topic</h3>
          <form onSubmit={createTopic} className="space-y-2 mt-2">
            <input
              placeholder="title"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              className="rounded border px-2 py-1"
            />
            <input
              placeholder="slug"
              value={topicSlug}
              onChange={(e) => setTopicSlug(e.target.value)}
              className="rounded border px-2 py-1"
            />
            <input
              placeholder="description"
              value={topicDescription}
              onChange={(e) => setTopicDescription(e.target.value)}
              className="rounded border px-2 py-1"
            />
            <select
              value={topicLevel}
              onChange={(e) => setTopicLevel(e.target.value)}
              className="rounded border px-2 py-1"
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
            <div>
              <button className="inline-flex items-center rounded bg-indigo-600 px-3 py-2 text-sm text-white">
                Create topic
              </button>
            </div>
          </form>

          <h3 className="mt-4 font-semibold">Create challenge (first topic)</h3>
          <form onSubmit={createChallenge} className="space-y-2 mt-2">
            <textarea
              placeholder="prompt"
              value={challengePrompt}
              onChange={(e) => setChallengePrompt(e.target.value)}
              className="w-full rounded border px-2 py-1"
            />
            <input
              placeholder="languageId"
              value={String(challengeLanguageId)}
              onChange={(e) => setChallengeLanguageId(Number(e.target.value))}
              className="rounded border px-2 py-1"
            />
            <div>
              <button className="inline-flex items-center rounded bg-indigo-600 px-3 py-2 text-sm text-white">
                Create challenge
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {message ? <div className="text-sm text-zinc-700">{message}</div> : null}
    </div>
  );
}
