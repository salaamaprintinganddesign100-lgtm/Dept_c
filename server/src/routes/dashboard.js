import { Router } from "express";
import { getStats } from "../controllers/dashboardController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, authorize("dashboard:read"), getStats);

export default router;
