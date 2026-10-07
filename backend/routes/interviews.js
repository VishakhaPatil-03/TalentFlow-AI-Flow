
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { getPool } from "../db.js";

const router = express.Router();

/*
 * GET /api/interviews
 */

router.get("/", async (req, res, next) => {
  try {
    const pool = getPool();

    const [rows] = await pool.query(`
      SELECT
        i.*,

        a.status AS application_status,

        c.first_name,
        c.last_name,
        c.email,

        j.title AS job_title

      FROM interviews i

      INNER JOIN applications a
        ON a.id = i.application_id

      INNER JOIN candidates c
        ON c.id = a.candidate_id

      INNER JOIN jobs j
        ON j.id = a.job_id

      ORDER BY i.scheduled_at ASC
    `);

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
 * GET /api/interviews/:id
 */

router.get("/:id", async (req, res, next) => {
  try {
    const pool = getPool();

    const [rows] = await pool.query(
      `
      SELECT
        i.*,

        c.first_name,
        c.last_name,
        c.email,

        j.title AS job_title

      FROM interviews i

      INNER JOIN applications a
        ON a.id = i.application_id

      INNER JOIN candidates c
        ON c.id = a.candidate_id

      INNER JOIN jobs j
        ON j.id = a.job_id

      WHERE i.id = ?
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Interview not found"
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
 * POST /api/interviews
 */

router.post("/", async (req, res, next) => {
  try {
    const pool = getPool();

    const {
      application_id,
      interviewer_name,
      interviewer_email,
      interview_type = "VIDEO",
      scheduled_at,
      meeting_url
    } = req.body;

    if (!application_id || !scheduled_at) {
      return res.status(400).json({
        success: false,
        message: "application_id and scheduled_at are required"
      });
    }

    const [application] = await pool.query(
      `
      SELECT id
      FROM applications
      WHERE id = ?
      `,
      [application_id]
    );

    if (application.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO interviews
      (
        id,
        application_id,
        interviewer_name,
        interviewer_email,
        interview_type,
        scheduled_at,
        meeting_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        application_id,
        interviewer_name || null,
        interviewer_email || null,
        interview_type,
        scheduled_at,
        meeting_url || null
      ]
    );

    /*
     * Update application status automatically.
     */

    await pool.query(
      `
      UPDATE applications
      SET status = 'INTERVIEW'
      WHERE id = ?
      `,
      [application_id]
    );

    res.status(201).json({
      success: true,
      message: "Interview scheduled successfully",
      data: {
        id
      }
    });
  } catch (error) {
    next(error);
  }
});

/*
 * PATCH /api/interviews/:id
 */

router.patch("/:id", async (req, res, next) => {
  try {
    const pool = getPool();

    const {
      status,
      feedback,
      score,
      meeting_url,
      scheduled_at
    } = req.body;

    const [result] = await pool.query(
      `
      UPDATE interviews
      SET
        status = COALESCE(?, status),
        feedback = COALESCE(?, feedback),
        score = COALESCE(?, score),
        meeting_url = COALESCE(?, meeting_url),
        scheduled_at = COALESCE(?, scheduled_at)
      WHERE id = ?
      `,
      [
        status || null,
        feedback || null,
        score ?? null,
        meeting_url || null,
        scheduled_at || null,
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Interview not found"
      });
    }

    res.json({
      success: true,
      message: "Interview updated successfully"
    });
  } catch (error) {
    next(error);
  }
});

/*
 * DELETE /api/interviews/:id
 */

router.delete("/:id", async (req, res, next) => {
  try {
    const pool = getPool();

    const [result] = await pool.query(
      `
      DELETE FROM interviews
      WHERE id = ?
      `,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Interview not found"
      });
    }

    res.json({
      success: true,
      message: "Interview deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

export default router;

