export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Mark}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function toTitleCase(value: string): string {
  if (!value) {
    return "";
  }

  return value
    .split(/\s+|_/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function normalizeTextKey(value: string): string {
  return slugify(value) || value.trim().toLowerCase();
}
