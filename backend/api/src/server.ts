import { createServer } from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectMongo } from "./services/database.js";

async function bootstrap() {
  await connectMongo();

  const server = createServer(app);
  const PORT = env.PORT;

  server.listen(PORT, () => {
    logger.info({ port: PORT }, "API server listening");
  });
}

bootstrap().catch((error) => {
  logger.error({ error }, "Failed to start API server");
  process.exit(1);
});
