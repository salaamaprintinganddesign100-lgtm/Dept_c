import { Router } from "express";
import {
  listAttendances,
  getClassDay,
  saveClassDay,
  upsertAttendance,
  deleteAttendance,
  monthlySummary,
  todayWorkflow,
} from "../controllers/attendanceController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/class-day", authorize("attendances:read"), getClassDay);
router.post("/class-day", authorize("attendances:create"), saveClassDay);
router.get("/monthly-summary", authorize("attendances:read"), monthlySummary);
router.get("/today-workflow", authorize("attendances:read"), todayWorkflow);
router.get("/", authorize("attendances:read"), listAttendances);
router.post("/", authorize("attendances:create"), upsertAttendance);
router.delete("/:id", authorize("attendances:delete"), deleteAttendance);

export default router;
