import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { fetchAssignableRoles, fetchCurrentUser } from "@/lib/server-auth";

export default async function SignupPage({
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

  const roles = await fetchAssignableRoles();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-3xl font-semibold text-zinc-900">
          Join the Talent Setu community
        </h1>
        <p className="text-sm text-zinc-600">
          Create a single account to access AI-generated courses, judge-powered
          code playgrounds, role-based assessments, and recruiter visibility.
        </p>
      </div>
      <SignupForm roles={roles} redirectTo={redirectTo} />
    </div>
  );
}
