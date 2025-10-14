import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/lib/server-auth";

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

export default async function DashboardPage() {
  const session = await fetchCurrentUser();

  if (!session) {
    redirect("/login?from=/dashboard");
  }

  const { user, profile } = session;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Hello, {profile.displayName}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your account is ready. Explore courses, queue assessments, and watch
          your recruiter-facing profile evolve as you complete milestones.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-zinc-600">
          <div className="rounded-lg border border-zinc-200 px-4 py-3">
            <span className="block text-xs uppercase text-zinc-400">Email</span>
            <span className="font-medium text-zinc-800">{user.email}</span>
          </div>
          <div className="rounded-lg border border-zinc-200 px-4 py-3">
            <span className="block text-xs uppercase text-zinc-400">Roles</span>
            <span className="font-medium text-zinc-800">
              {user.roles
                .map((role) => role.charAt(0).toUpperCase() + role.slice(1))
                .join(", ")}
            </span>
          </div>
          <div className="rounded-lg border border-zinc-200 px-4 py-3">
            <span className="block text-xs uppercase text-zinc-400">
              Email verified
            </span>
            <span className="font-medium text-zinc-800">
              {user.emailVerified ? "Yes" : "Pending"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">
            Profile snapshot
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li>
              <span className="text-zinc-400">Headline:</span>{" "}
              {profile.headline ?? "Add a headline to stand out"}
            </li>
            <li>
              <span className="text-zinc-400">Location:</span>{" "}
              {profile.location ?? "Set your preferred location"}
            </li>
            <li>
              <span className="text-zinc-400">Experience:</span>{" "}
              {profile.experienceYears != null
                ? `${profile.experienceYears} years`
                : "Share your experience"}
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">
            Recent activity
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li>
              <span className="text-zinc-400">Last login:</span>{" "}
              {formatDate(user.lastLoginAt) ?? "—"}
            </li>
            <li>
              <span className="text-zinc-400">Account created:</span>{" "}
              {formatDate(user.createdAt)}
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">
            What&apos;s next
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li>• Generate your first course outline with the AI service.</li>
            <li>• Complete the profile basics for recruiter visibility.</li>
            <li>• Invite a teammate to run an assessment dry-run.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
