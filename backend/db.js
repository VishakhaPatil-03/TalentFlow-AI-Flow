
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import {
  SecretsManagerClient,
  GetSecretValueCommand
} from "@aws-sdk/client-secrets-manager";

dotenv.config();

let pool;

async function getDatabaseCredentials() {
  /*
   * Production:
   * If RDS_SECRET_ARN is configured, read credentials from
   * AWS Secrets Manager using the EC2 IAM role.
   */

  if (process.env.RDS_SECRET_ARN) {
    const client = new SecretsManagerClient({
      region: process.env.AWS_REGION || "ap-south-1"
    });

    const command = new GetSecretValueCommand({
      SecretId: process.env.RDS_SECRET_ARN
    });

    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error("RDS secret does not contain SecretString");
    }

    return JSON.parse(response.SecretString);
  }

  /*
   * Local development:
   * Use .env database variables.
   */

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  };
}

export async function initializeDatabase() {
  const credentials = await getDatabaseCredentials();

  if (!credentials.host) {
    throw new Error("Database host is missing");
  }

  pool = mysql.createPool({
    host: credentials.host,
    port: Number(credentials.port || 3306),
    user: credentials.username || credentials.user,
    password: credentials.password,
    database: credentials.database || process.env.DB_NAME || "talentflow",

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });

  const connection = await pool.getConnection();

  try {
    await connection.query("SELECT 1");
    console.log("MySQL database connection successful");

    await createTables(connection);

    console.log("Database tables verified successfully");
  } finally {
    connection.release();
  }

  return pool;
}

async function createTables(connection) {
  /*
   * USERS
   */

  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      role ENUM(
        'ADMIN',
        'RECRUITER',
        'HIRING_MANAGER',
        'INTERVIEWER'
      ) DEFAULT 'RECRUITER',
      status ENUM(
        'ACTIVE',
        'INACTIVE'
      ) DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  /*
   * CANDIDATES
   */

  await connection.query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id CHAR(36) PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100),
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(30),
      location VARCHAR(255),
      skills JSON,
      experience_years DECIMAL(4,1) DEFAULT 0,
      resume_url TEXT,
      resume_key TEXT,
      status ENUM(
        'ACTIVE',
        'INACTIVE',
        'HIRED',
        'REJECTED'
      ) DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  /*
   * JOBS
   */

  await connection.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id CHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      department VARCHAR(150),
      location VARCHAR(255),
      employment_type ENUM(
        'FULL_TIME',
        'PART_TIME',
        'CONTRACT',
        'INTERNSHIP'
      ) DEFAULT 'FULL_TIME',
      description TEXT,
      requirements TEXT,
      skills JSON,
      salary_min DECIMAL(12,2),
      salary_max DECIMAL(12,2),
      status ENUM(
        'DRAFT',
        'OPEN',
        'CLOSED'
      ) DEFAULT 'DRAFT',
      created_by CHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_jobs_status(status),
      INDEX idx_jobs_created_by(created_by)
    )
  `);

  /*
   * APPLICATIONS
   */

  await connection.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id CHAR(36) PRIMARY KEY,
      candidate_id CHAR(36) NOT NULL,
      job_id CHAR(36) NOT NULL,

      status ENUM(
        'APPLIED',
        'SCREENING',
        'SHORTLISTED',
        'INTERVIEW',
        'SELECTED',
        'REJECTED',
        'WITHDRAWN'
      ) DEFAULT 'APPLIED',

      source VARCHAR(100),
      screening_score DECIMAL(5,2),
      notes TEXT,

      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      CONSTRAINT fk_application_candidate
        FOREIGN KEY(candidate_id)
        REFERENCES candidates(id)
        ON DELETE CASCADE,

      CONSTRAINT fk_application_job
        FOREIGN KEY(job_id)
        REFERENCES jobs(id)
        ON DELETE CASCADE,

      UNIQUE KEY unique_candidate_job(candidate_id, job_id),

      INDEX idx_app_candidate(candidate_id),
      INDEX idx_app_job(job_id),
      INDEX idx_app_status(status)
    )
  `);

  /*
   * INTERVIEWS
   */

  await connection.query(`
    CREATE TABLE IF NOT EXISTS interviews (
      id CHAR(36) PRIMARY KEY,
      application_id CHAR(36) NOT NULL,

      interviewer_name VARCHAR(255),
      interviewer_email VARCHAR(255),

      interview_type ENUM(
        'PHONE',
        'VIDEO',
        'ONSITE',
        'TECHNICAL',
        'HR'
      ) DEFAULT 'VIDEO',

      scheduled_at DATETIME,

      status ENUM(
        'SCHEDULED',
        'COMPLETED',
        'CANCELLED',
        'NO_SHOW'
      ) DEFAULT 'SCHEDULED',

      meeting_url TEXT,
      feedback TEXT,
      score DECIMAL(5,2),

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      CONSTRAINT fk_interview_application
        FOREIGN KEY(application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE,

      INDEX idx_interview_application(application_id),
      INDEX idx_interview_date(scheduled_at)
    )
  `);

  /*
   * RESUME PROCESSING
   */

  await connection.query(`
    CREATE TABLE IF NOT EXISTS resume_processing (
      id CHAR(36) PRIMARY KEY,

      candidate_id CHAR(36),

      s3_bucket VARCHAR(255) NOT NULL,
      s3_key TEXT NOT NULL,

      processing_status ENUM(
        'UPLOADED',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
      ) DEFAULT 'UPLOADED',

      extracted_text LONGTEXT,
      ai_score DECIMAL(5,2),
      ai_summary TEXT,

      error_message TEXT,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      CONSTRAINT fk_resume_candidate
        FOREIGN KEY(candidate_id)
        REFERENCES candidates(id)
        ON DELETE SET NULL,

      INDEX idx_resume_candidate(candidate_id),
      INDEX idx_resume_status(processing_status)
    )
  `);
}

export function getPool() {
  if (!pool) {
    throw new Error("Database pool has not been initialized");
  }

  return pool;
}

export default {
  initializeDatabase,
  getPool
};

