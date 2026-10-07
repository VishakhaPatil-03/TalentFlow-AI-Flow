
import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import { initializeDatabase } from "./db.js";

import usersRouter from "./routes/users.js";
import candidatesRouter from "./routes/candidates.js";
import jobsRouter from "./routes/jobs.js";
import applicationsRouter from "./routes/applications.js";
import interviewsRouter from "./routes/interviews.js";
import resumesRouter from "./routes/resumes.js";

import errorHandler from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 3000);

const corsOrigin = process.env.CORS_ORIGIN || "*";

app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin,
    credentials: corsOrigin !== "*"
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/*
 * Request logging
 */

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });

  next();
});

/*
 * Root endpoint
 */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TalentFlow AI Backend API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development"
  });
});

/*
 * Health check
 *
 * ALB will use:
 * GET /health
 */

app.get("/health", async (req, res) => {
  try {
    const { getPool } = await import("./db.js");

    const pool = getPool();

    await pool.query("SELECT 1");

    res.status(200).json({
      status: "healthy",
      service: "talentflow-ai-backend",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health check failed:", error);

    res.status(503).json({
      status: "unhealthy",
      service: "talentflow-ai-backend",
      database: "disconnected",
      timestamp: new Date().toISOString()
    });
  }
});

/*
 * API routes
 */

app.use("/api/users", usersRouter);
app.use("/api/candidates", candidatesRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/interviews", interviewsRouter);
app.use("/api/resumes", resumesRouter);

/*
 * 404 handler
 */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl
  });
});

/*
 * Global error handler
 */

app.use(errorHandler);

/*
 * Start server
 */

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log("========================================");
      console.log("TalentFlow AI Backend");
      console.log("========================================");
      console.log(`Environment : ${process.env.NODE_ENV}`);
      console.log(`Port        : ${PORT}`);
      console.log(`AWS Region  : ${process.env.AWS_REGION}`);
      console.log("Server      : http://0.0.0.0:" + PORT);
      console.log("========================================");
    });
  } catch (error) {
    console.error("Failed to start application");
    console.error(error);

    process.exit(1);
  }
}

startServer();
