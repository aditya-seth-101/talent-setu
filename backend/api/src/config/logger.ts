import pino from "pino";

function buildTransport() {
  if (process.env.NODE_ENV === "production") return undefined;

  try {
    // pino-pretty may not be installed in production images; guard against it.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require.resolve("pino-pretty");
    return { target: "pino-pretty" };
  } catch {
    return undefined;
  }
}

export const logger = pino({
  transport: buildTransport(),
  level: process.env.LOG_LEVEL ?? "info",
});
