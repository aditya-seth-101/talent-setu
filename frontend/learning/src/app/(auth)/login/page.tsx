import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { fetchCurrentUser } from "@/lib/server-auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  const redirectTo =
    typeof params?.from === "string" ? params.from : "/dashboard";

  const session = await fetchCurrentUser();
  if (session) {
    redirect(redirectTo);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 md:flex-row">
      <div className="flex-1 space-y-4">
        <h1 className="text-3xl font-semibold text-zinc-900">
          Welcome back to Talent Setu
        </h1>
        <p className="text-sm text-zinc-600">
          Continue your learning journey, review assessments, and share progress
          with recruiters—all from one secure account.
        </p>
        <ul className="space-y-3 text-sm text-zinc-600">
          <li>
            • Resume unfinished challenges with Monaco editor state saved.
          </li>
          <li>• Track assessment invitations and proctored sessions.</li>
          <li>
            • Keep your unified profile in sync across learning and recruiting.
          </li>
        </ul>
      </div>
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
