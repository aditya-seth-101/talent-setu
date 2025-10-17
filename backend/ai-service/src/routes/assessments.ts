import { Router } from "express";
import { assessmentQuestionRequestSchema } from "../schemas/assessment-question.schema.js";
import { generateAssessmentPhaseContent } from "../services/assessment-question.service.js";
import { voiceEvaluationRequestSchema } from "../schemas/assessment-voice-evaluation.schema.js";
import { evaluateVoiceTranscript } from "../services/assessment-voice.service.js";

export const assessmentsRouter = Router();

assessmentsRouter.post("/questions", async (req, res, next) => {
  try {
    const payload = assessmentQuestionRequestSchema.parse(req.body);
    const result = await generateAssessmentPhaseContent(payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

assessmentsRouter.post("/voice-evaluation", async (req, res, next) => {
  try {
    const payload = voiceEvaluationRequestSchema.parse(req.body);
    const result = await evaluateVoiceTranscript(payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
