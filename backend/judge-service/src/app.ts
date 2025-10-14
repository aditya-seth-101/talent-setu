import express from "express";
import pinoHttp from "pino-http";
import { router } from "./routes/index.js";
import { logger } from "./config/logger.js";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));
app.use("/judge", router);

app.get("/", (_req, res) => {
  res.json({ status: "judge-service", version: "0.1.0" });
});

export default app;
