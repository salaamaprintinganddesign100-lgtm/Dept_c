import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import roleRoutes from "./routes/roles.js";
import permissionRoutes from "./routes/permissions.js";
import dashboardRoutes from "./routes/dashboard.js";
import classRoutes from "./routes/classes.js";
import studentRoutes from "./routes/students.js";
import examRoutes from "./routes/exams.js";
import bookRoutes from "./routes/books.js";
import attendanceRoutes from "./routes/attendances.js";
import setupRoutes from "./routes/setup.js";

dotenv.config();

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (
        !origin ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin)
      ) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "8mb" }));

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    app: "DEPT_C API",
    health: "/api/health",
    login: "POST /api/session/login",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "DEPT_C", host: "vercel+neon" });
});

/** Note: /api/auth is reserved on Vercel — use /api/session */
app.use("/api/bootstrap", setupRoutes);
app.use("/api/session", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/attendances", attendanceRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

export default app;
