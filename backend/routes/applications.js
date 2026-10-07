
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { getPool } from "../db.js";

const router = express.Router();

/*
 * GET /api/applications
 */

router.get("/", async (req, res, next) => {
  try {
    const pool = getPool();

    const { status, job_id, candidate_id } = req.query;

    let sql = `
      SELECT
        a.*,

        c.first_name,
        c.last_name,
        c.email,

        j.title AS job_title,
        j.department,
        j.location

      FROM applications a

      INNER JOIN candidates c
        ON c.id = a.candidate_id

      INNER JOIN jobs j
        ON j.id = a.job_id

      WHERE 1 = 1
    `;

    const params = [];

    if (status) {
      sql += ` AND a.status = ? `;
      params.push(status);
    }

    if (job_id) {
      sql += ` AND a.job_id = ? `;
      params.push(job_id);
    }

    if (candidate_id) {
      sql += ` AND a.candidate_id = ? `;
      params.push(candidate_id);
    }

    sql += `
      ORDER BY a.applied_at DESC
    `;

    const [rows] = await pool.query(sql, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
});

/*
 * GET /api/applications/:id
 */

router.get("/:id", async (req, res, next) => {
  try {
    const pool = getPool();

    const [rows] = await pool.query(
      `
      SELECT
        a.*,

        c.first_name,
        c.last_name,
        c.email,
        c.phone,

        j.title AS job_title,
        j.department,
        j.location

      FROM applications a

      INNER JOIN candidates c
        ON c.id = a.candidate_id

      INNER JOIN jobs j
        ON j.id = a.job_id

      WHERE a.id = ?
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/*
 * POST /api/applications
 */

router.post("/", async (req, res, next) => {
  try {
    const pool = getPool();

    const {
      candidate_id,
      job_id,
      source = "WEBSITE",
      notes
    } = req.body;

    if (!candidate_id || !job_id) {
      return res.status(400).json({
        success: false,
        message: "candidate_id and job_id are required"
      });
    }

    /*
     * Verify candidate
     */

    const [candidate] = await pool.query(
      `
      SELECT id
      FROM candidates
      WHERE id = ?
      `,
      [candidate_id]
    );

    if (candidate.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found"
      });
    }

    /*
     * Verify job
     */

    const [job] = await pool.query(
      `
      SELECT id
      FROM jobs
      WHERE id = ?
      `,
      [job_id]
    );

    if (job.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO applications
      (
        id,
        candidate_id,
        job_id,
        source,
        notes
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        id,
        candidate_id,
        job_id,
        source,
        notes || null
      ]
    );

    res.status(201).json({
      success: true,
      message: "Application created successfully",
      data: {
        id,
        candidate_id,
        job_id,
        status: "APPLIED"
      }
    });
  } catch (error) {
    next(error);
  }
});

/*
 * PATCH /api/applications/:id/status
 */

router.patch("/:id/status", async (req, res, next) => {
  try {
    const pool = getPool();

    const {
      status,
      screening_score,
      notes
    } = req.body;

    const allowedStatuses = [
      "APPLIED",
      "SCREENING",
      "SHORTLISTED",
      "INTERVIEW",
      "SELECTED",
      "REJECTED",
      "WITHDRAWN"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application status"
      });
    }

    const [result] = await pool.query(
      `
      UPDATE applications
      SET
        status = ?,
        screening_score = COALESCE(?, screening_score),
        notes = COALESCE(?, notes)
      WHERE id = ?
      `,
      [
        status,
        screening_score ?? null,
        notes ?? null,
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    res.json({
      success: true,
      message: "Application status updated"
    });
  } catch (error) {
    next(error);
  }
});

/*
 * DELETE /api/applications/:id
 */

router.delete("/:id", async (req, res, next) => {
  try {
    const pool = getPool();

    const [result] = await pool.query(
      `
      DELETE FROM applications
      WHERE id = ?
      `,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    res.json({
      success: true,
      message: "Application deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

export default router;
