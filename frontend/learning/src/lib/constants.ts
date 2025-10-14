export const ACCESS_TOKEN_COOKIE = "talent_access_token";
export const REFRESH_TOKEN_COOKIE = "talent_refresh_token";

const FIFTEEN_MINUTES = 15 * 60;
const SEVEN_DAYS = 7 * 24 * 60 * 60;

export const ACCESS_TOKEN_MAX_AGE = FIFTEEN_MINUTES;
export const REFRESH_TOKEN_MAX_AGE = SEVEN_DAYS;

export const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:4000";

export const SECURE_COOKIE = process.env.NODE_ENV === "production";
