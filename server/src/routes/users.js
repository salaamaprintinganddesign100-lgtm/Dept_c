import { Router } from "express";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("users:read"), listUsers);
router.post("/", authorize("users:create"), createUser);
router.put("/:id", authorize("users:update"), updateUser);
router.delete("/:id", authorize("users:delete"), deleteUser);

export default router;
