import { Router } from "express";
import { hintRequestSchema } from "../schemas/hint.schema.js";
import { generateChallengeHint } from "../services/hint-generator.js";

export const learningRouter = Router();

learningRouter.post("/hints", async (req, res, next) => {
  try {
    const payload = hintRequestSchema.parse(req.body);
    const result = await generateChallengeHint(payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
