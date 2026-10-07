
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { getPool } from "../db.js";

const router = express.Router();

/*
 * GET /api/jobs
 */

router.get("/", async (req, res, next) => {
  try {
    const pool = getPool();

    const { status } = req.query;

    let sql = `
      SELECT *
      FROM jobs
    `;

    const params = [];

    if (status) {
      sql += ` WHERE status = ? `;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC `;

    const [rows] = await pool.query(sql, params);

    const data = rows.map((job) => ({
      ...job,
      skills:
        typeof job.skills === "string"
          ? JSON.parse(job.skills || "[]")
          : job.skills
    }));

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
});

/*
 * GET /api/jobs/:id
 */

router.get("/:id", async (req, res, next) => {
  try {
    const pool = getPool();

    const [rows] = await pool.query(
      `
      SELECT *
      FROM jobs
      WHERE id = ?
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }

    const job = rows[0];

    if (typeof job.skills === "string") {
      job.skills = JSON.parse(job.skills || "[]");
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
});

/*
 * POST /api/jobs
 */

router.post("/", async (req, res, next) => {
  try {
    const pool = getPool();

    const {
      title,
      department,
      location,
      employment_type = "FULL_TIME",
      description,
      requirements,
      skills = [],
      salary_min,
      salary_max,
      status = "DRAFT",
      created_by
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Job title is required"
      });
    }

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO jobs
      (
        id,
        title,
        department,
        location,
        employment_type,
        description,
        requirements,
        skills,
        salary_min,
        salary_max,
        status,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        title,
        department || null,
        location || null,
        employment_type,
        description || null,
        requirements || null,
        JSON.stringify(skills),
        salary_min || null,
        salary_max || null,
        status,
        created_by || null
      ]
    );

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: {
        id
      }
    });
  } catch (error) {
    next(error);
  }
});

/*
 * PUT /api/jobs/:id
 */

router.put("/:id", async (req, res, next) => {
  try {
    const pool = getPool();

    const {
      title,
      department,
      location,
      employment_type,
      description,
      requirements,
      skills,
      salary_min,
      salary_max,
      status
    } = req.body;

    const [result] = await pool.query(
      `
      UPDATE jobs
      SET
        title = COALESCE(?, title),
        department = COALESCE(?, department),
        location = COALESCE(?, location),
        employment_type = COALESCE(?, employment_type),
        description = COALESCE(?, description),
        requirements = COALESCE(?, requirements),
        skills = COALESCE(?, skills),
        salary_min = COALESCE(?, salary_min),
        salary_max = COALESCE(?, salary_max),
        status = COALESCE(?, status)
      WHERE id = ?
      `,
      [
        title || null,
        department || null,
        location || null,
        employment_type || null,
        description || null,
        requirements || null,
        skills !== undefined ? JSON.stringify(skills) : null,
        salary_min !== undefined ? salary_min : null,
        salary_max !== undefined ? salary_max : null,
        status || null,
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }

    res.json({
      success: true,
      message: "Job updated successfully"
    });
  } catch (error) {
    next(error);
  }
});

/*
 * DELETE /api/jobs/:id
 */

router.delete("/:id", async (req, res, next) => {
  try {
    const pool = getPool();

    const [result] = await pool.query(
      `
      DELETE FROM jobs
      WHERE id = ?
      `,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }

    res.json({
      success: true,
      message: "Job deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

export default router;

