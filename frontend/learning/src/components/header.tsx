import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { fetchCurrentUser } from "@/lib/server-auth";

export async function Header() {
  const session = await fetchCurrentUser();
  const isAuthenticated = Boolean(session);

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold text-indigo-600">
          Talent Setu
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 hover:text-indigo-600"
          >
            Home
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-zinc-600 hover:text-indigo-600"
              >
                Dashboard
              </Link>
              <span className="hidden text-sm text-zinc-500 sm:inline">
                {session?.profile.displayName}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
