import { Router } from "express";
import {
  listExams,
  classBoard,
  updateExam,
  advanceClass,
} from "../controllers/examController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/board", authorize("exams:read"), classBoard);
router.get("/", authorize("exams:read"), listExams);
router.post("/advance-class", authorize("exams:update"), advanceClass);
router.put("/:id", authorize("exams:update"), updateExam);

export default router;
