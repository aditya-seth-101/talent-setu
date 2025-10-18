import { redirect } from "next/navigation";
import { LeaderboardFilter } from "@/components/leaderboard-filter";
import { apiRequest } from "@/lib/api-client";
import { fetchCurrentUser } from "@/lib/server-auth";
import type {
  LeaderboardResponse,
  TechnologySearchResponse,
  TechnologySummary,
} from "@/types/api";

function formatTimestamp(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const session = await fetchCurrentUser();

  if (!session) {
    redirect("/login?from=/leaderboard");
  }

  const technologyParam = searchParams?.technologyId;
  const technologyId = Array.isArray(technologyParam)
    ? technologyParam[0]
    : technologyParam;

  const query = new URLSearchParams();
  query.set("limit", "25");
  if (technologyId) {
    query.set("technologyId", technologyId);
  }

  const leaderboardResponse = await apiRequest(
    `/api/learning/leaderboard${query.toString() ? `?${query.toString()}` : ""}`
  );

  if (!leaderboardResponse.ok) {
    throw new Error(
      `Failed to load leaderboard (${leaderboardResponse.status})`
    );
  }

  const leaderboard = (await leaderboardResponse.json()) as LeaderboardResponse;

  const technologies = await fetchTechnologies();

  const currentProfileId = session.profile.id;
  const leaders = leaderboard.leaders ?? [];
  const selectedTechnology = technologies.find(
    (tech) => tech.id === technologyId
  );

  const subtitle = selectedTechnology
    ? `Top learners for ${selectedTechnology.name}`
    : "Top learners across all technologies";

  const yourRank = leaders.findIndex(
    (entry) => entry.profileId === currentProfileId
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-zinc-900">Leaderboard</h1>
        <p className="text-sm text-zinc-600">{subtitle}</p>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <LeaderboardFilter
            technologies={technologies}
            selectedTechnologyId={technologyId}
          />
          <div className="text-xs text-zinc-500">
            Last updated {formatTimestamp(leaderboard.updatedAt)}
          </div>
        </div>

        {leaders.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">
                    Rank
                  </th>
                  <th scope="col" className="px-4 py-3 text-left">
                    Learner
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Net XP
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Base XP
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Hint penalty
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Topics
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {leaders.map((entry, index) => {
                  const isCurrentUser = entry.profileId === currentProfileId;
                  const rowRank = index + 1;
                  return (
                    <tr
                      key={entry.profileId}
                      className={`transition hover:bg-indigo-50 ${
                        isCurrentUser
                          ? "bg-indigo-50/70"
                          : index % 2 === 1
                          ? "bg-zinc-50"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-zinc-700">
                        {rowRank}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-zinc-900">
                          {entry.displayName}
                        </div>
                        {isCurrentUser ? (
                          <div className="text-xs text-indigo-600">
                            That&apos;s you! Keep the streak going.
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-800">
                        {formatNumber(entry.netXp)}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600">
                        {formatNumber(entry.baseXp)}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-600">
                        -{formatNumber(entry.hintPenalty)}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600">
                        {entry.completedTopics}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500">
                        {formatTimestamp(entry.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
            No learners have earned XP for this filter yet. Complete a gate
            challenge to claim the top spot.
          </div>
        )}

        {yourRank === -1 && leaders.length > 0 ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            Participate in a gate challenge to appear on the leaderboard.
          </div>
        ) : null}
      </section>
    </div>
  );
}

async function fetchTechnologies(): Promise<TechnologySummary[]> {
  const response = await apiRequest("/api/technology?limit=50");

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as TechnologySearchResponse;
  return data.technologies ?? [];
}
