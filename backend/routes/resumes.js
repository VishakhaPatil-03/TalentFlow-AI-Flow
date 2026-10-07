
import express from "express";
import { v4 as uuidv4 } from "uuid";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getPool } from "../db.js";

const router = express.Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1"
});

const bucket = process.env.S3_BUCKET;

/*
 * POST /api/resumes/upload-url
 *
 * Creates a presigned URL.
 */

router.post("/upload-url", async (req, res, next) => {
  try {
    if (!bucket) {
      return res.status(500).json({
        success: false,
        message: "S3_BUCKET environment variable is not configured"
      });
    }

    const {
      candidate_id,
      file_name,
      content_type
    } = req.body;

    if (!candidate_id || !file_name || !content_type) {
      return res.status(400).json({
        success: false,
        message: "candidate_id, file_name and content_type are required"
      });
    }

    const extension = file_name.includes(".")
      ? file_name.split(".").pop()
      : "pdf";

    const key = `resumes/${candidate_id}/${uuidv4()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: content_type
    });

    const uploadUrl = await getSignedUrl(
      s3,
      command,
      {
        expiresIn: 900
      }
    );

    res.json({
      success: true,
      data: {
        upload_url: uploadUrl,
        bucket,
        key,
        expires_in: 900
      }
    });
  } catch (error) {
    next(error);
  }
});

/*
 * POST /api/resumes/register
 *
 * After upload, register resume metadata.
 */

router.post("/register", async (req, res, next) => {
  try {
    const pool = getPool();

    const {
      candidate_id,
      bucket: s3Bucket,
      key
    } = req.body;

    if (!candidate_id || !s3Bucket || !key) {
      return res.status(400).json({
        success: false,
        message: "candidate_id, bucket and key are required"
      });
    }

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO resume_processing
      (
        id,
        candidate_id,
        s3_bucket,
        s3_key,
        processing_status
      )
      VALUES (?, ?, ?, ?, 'UPLOADED')
      `,
      [
        id,
        candidate_id,
        s3Bucket,
        key
      ]
    );

    /*
     * Store S3 key on candidate.
     */

    await pool.query(
      `
      UPDATE candidates
      SET resume_key = ?
      WHERE id = ?
      `,
      [
        key,
        candidate_id
      ]
    );

    res.status(201).json({
      success: true,
      message: "Resume registered successfully",
      data: {
        id,
        candidate_id,
        bucket: s3Bucket,
        key
      }
    });
  } catch (error) {
    next(error);
  }
});

/*
 * GET /api/resumes/:id/download-url
 */

router.get("/:id/download-url", async (req, res, next) => {
  try {
    const pool = getPool();

    const [rows] = await pool.query(
      `
      SELECT
        s3_bucket,
        s3_key
      FROM resume_processing
      WHERE id = ?
      `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Resume not found"
      });
    }

    const resume = rows[0];

    const command = new GetObjectCommand({
      Bucket: resume.s3_bucket,
      Key: resume.s3_key
    });

    const downloadUrl = await getSignedUrl(
      s3,
      command,
      {
        expiresIn: 900
      }
    );

    res.json({
      success: true,
      data: {
        download_url: downloadUrl,
        expires_in: 900
      }
    });
  } catch (error) {
    next(error);
  }
});

/*
 * GET /api/resumes/candidate/:candidateId
 */

router.get("/candidate/:candidateId", async (req, res, next) => {
  try {
    const pool = getPool();

    const [rows] = await pool.query(
      `
      SELECT
        id,
        candidate_id,
        s3_bucket,
        s3_key,
        processing_status,
        ai_score,
        ai_summary,
        error_message,
        created_at,
        updated_at
      FROM resume_processing
      WHERE candidate_id = ?
      ORDER BY created_at DESC
      `,
      [req.params.candidateId]
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;

