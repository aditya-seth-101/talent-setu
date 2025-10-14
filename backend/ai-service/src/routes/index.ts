import { Router } from "express";
import { promptRouter } from "./prompt.js";

export const router = Router();

router.use("/prompts", promptRouter);
