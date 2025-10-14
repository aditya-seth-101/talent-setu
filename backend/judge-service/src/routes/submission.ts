import { Router } from "express";
import { z } from "zod";
import { createSubmission, getSubmission } from "../clients/judge0-client.js";

export const submissionRouter = Router();

const submissionSchema = z.object({
  source_code: z.string().min(1),
  language_id: z.number().int(),
  stdin: z.string().optional(),
  expected_output: z.string().optional(),
  callback_url: z.string().url().optional(),
});

submissionRouter.post("/", async (req, res, next) => {
  try {
    const payload = submissionSchema.parse(req.body);
    const data = await createSubmission(payload);
    res.status(202).json(data);
  } catch (error) {
    next(error);
  }
});

submissionRouter.get("/:token", async (req, res, next) => {
  try {
    const { token } = req.params;
    const result = await getSubmission(token);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
