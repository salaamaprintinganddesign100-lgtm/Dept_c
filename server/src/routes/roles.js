import { Router } from "express";
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/roleController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("roles:read"), listRoles);
router.post("/", authorize("roles:create"), createRole);
router.put("/:id", authorize("roles:update"), updateRole);
router.delete("/:id", authorize("roles:delete"), deleteRole);

export default router;
