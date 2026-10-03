import { Router } from "express";
import {
  listBooks,
  listBookProgress,
  classBoard,
  updateBookProgress,
  saveStudentBookExam,
} from "../controllers/bookController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", authorize("books:read"), listBooks);
router.get("/board", authorize("books:read"), classBoard);
router.get("/progress", authorize("books:read"), listBookProgress);
router.post("/exam-marks", authorize("exams:update"), saveStudentBookExam);
router.put("/progress/:id", authorize("books:update"), updateBookProgress);

export default router;
