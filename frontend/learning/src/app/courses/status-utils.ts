import type { ProgressStatus } from "@/types/api";

export function formatProgressStatus(status: ProgressStatus) {
  return status
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function progressStatusClasses(status: ProgressStatus) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "in-progress":
      return "bg-amber-100 text-amber-800";
    case "unlocked":
      return "bg-sky-100 text-sky-800";
    default:
      return "bg-zinc-100 text-zinc-500";
  }
}
