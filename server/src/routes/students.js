import { Router } from "express";
import {
  listStudents,
  getStudent,
  registerStudent,
  updateStudent,
  deleteStudent,
} from "../controllers/studentController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", authorize("students:read"), listStudents);
router.get("/:id", authorize("students:read"), getStudent);
router.post("/", authorize("students:create"), registerStudent);
router.put("/:id", authorize("students:update"), updateStudent);
router.delete("/:id", authorize("students:delete"), deleteStudent);

export default router;
