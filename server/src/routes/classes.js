import { Router } from "express";
import {
  listClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
} from "../controllers/classController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", authorize("classes:read"), listClasses);
router.get("/:id", authorize("classes:read"), getClass);
router.post("/", authorize("classes:create"), createClass);
router.put("/:id", authorize("classes:update"), updateClass);
router.delete("/:id", authorize("classes:delete"), deleteClass);

export default router;
