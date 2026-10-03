import { Router } from "express";
import {
  listPermissions,
  createPermission,
} from "../controllers/permissionController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("permissions:read"), listPermissions);
router.post("/", authorize("permissions:create"), createPermission);

export default router;
