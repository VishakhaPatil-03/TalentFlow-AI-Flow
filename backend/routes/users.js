
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { getPool } from "../db.js";

const router = express.Router();

/*
 * GET /api/users
 */

router.get("/", async (req, res, next) => {
  try {
    const pool = getPool();

    const [rows] = await pool.query(`
      SELECT
        id,
        name,
        email,
        role,
        status,
        created_at,
        updated_at
      FROM users
      ORDER BY created_at DESC
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
 * GET /api/users/:id
 */

router.get("/:id", async (req, res, next) => {
  try {
    const pool = getPool();

    const [rows] = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        status,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
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
 * POST /api/users
 */

router.post("/", async (req, res, next) => {
  try {
    const pool = getPool();

    const {
      name,
      email,
      password_hash = null,
      role = "RECRUITER"
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "name and email are required"
      });
    }

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO users
      (
        id,
        name,
        email,
        password_hash,
        role
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        id,
        name,
        email,
        password_hash,
        role
      ]
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id,
        name,
        email,
        role
      }
    });
  } catch (error) {
    next(error);
  }
});

/*
 * PATCH /api/users/:id/status
 */

router.patch("/:id/status", async (req, res, next) => {
  try {
    const pool = getPool();

    const { status } = req.body;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be ACTIVE or INACTIVE"
      });
    }

    const [result] = await pool.query(
      `
      UPDATE users
      SET status = ?
      WHERE id = ?
      `,
      [status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      message: "User status updated"
    });
  } catch (error) {
    next(error);
  }
});

export default router;

