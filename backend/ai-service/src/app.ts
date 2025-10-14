import express from "express";
import pinoHttp from "pino-http";
import { router } from "./routes/index.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));
app.use("/ai", router);

app.get("/", (_req, res) => {
  res.json({ status: "ai-service", version: "0.1.0" });
});

app.use(errorHandler);

export default app;
