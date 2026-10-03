import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../prisma.js";

const router = Router();
const serverRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function runNode(scriptRel) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptRel], {
      cwd: serverRoot,
      env: process.env,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Seed failed (exit ${code})`));
    });
  });
}

/**
 * POST /api/setup/seed
 * Header: x-setup-secret: <SETUP_SECRET>
 * Runs seed against Neon (Admin / Teacher accounts).
 */
router.post("/seed", async (req, res) => {
  try {
    const secret = req.headers["x-setup-secret"] || req.body?.secret;
    if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
      return res.status(403).json({ message: "Invalid setup secret" });
    }

    await runNode("prisma/seed.js");
    const users = await prisma.user.count();
    res.json({
      message: "Seed complete",
      users,
      login: { email: "admin@deptc.com", password: "admin123" },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Seed failed" });
  }
});

export default router;
