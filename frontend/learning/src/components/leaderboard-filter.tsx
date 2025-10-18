"use client";

import { useTransition } from "react";
import type { ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TechnologySummary } from "@/types/api";

type LeaderboardFilterProps = {
  technologies: TechnologySummary[];
  selectedTechnologyId?: string;
};

export function LeaderboardFilter({
  technologies,
  selectedTechnologyId,
}: LeaderboardFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const value = selectedTechnologyId ?? "";

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextValue = event.target.value;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextValue) {
        params.set("technologyId", nextValue);
      } else {
        params.delete("technologyId");
      }
      const query = params.toString();
      const target =
        query.length > 0 ? `/leaderboard?${query}` : "/leaderboard";
      router.push(target);
    });
  }

  return (
    <label className="flex flex-col gap-2 text-sm text-zinc-600">
      <span className="font-semibold text-zinc-800">Filter by technology</span>
      <select
        name="technologyId"
        value={value}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        <option value="">All technologies</option>
        {technologies.map((tech) => (
          <option key={tech.id} value={tech.id}>
            {tech.name}
          </option>
        ))}
      </select>
    </label>
  );
}
