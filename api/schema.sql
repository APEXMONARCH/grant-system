-- ─────────────────────────────────────────────────────────────
-- Grant Management System — MySQL Schema (COMPLETE, v2)
--
-- Run once in phpMyAdmin or MySQL CLI:
--   CREATE DATABASE grant_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   USE grant_system;
--   (then paste / import all of this)
--
-- Changes from v1:
--   • messages: added thread_id, parent_id, sender_role, sender_id (two-way threading)
--   • NEW table: audit_logs (used by AuditController.php)
--   • application_documents: added file_id column + index (used by UploadController.php)
--   • Fixed seed admin email typo (was admin@grantystem.com)
-- ─────────────────────────────────────────────────────────────

SET FOREIGN_KEY_CHECKS = 0;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name           VARCHAR(100)  NOT NULL,
  last_name            VARCHAR(100)  NOT NULL,
  email                VARCHAR(191)  NOT NULL UNIQUE,
  password             VARCHAR(255)  NOT NULL,
  role                 ENUM('admin','reviewer','applicant') NOT NULL DEFAULT 'applicant',
  status               ENUM('active','inactive') NOT NULL DEFAULT 'active',
  organization         VARCHAR(255),
  institution          VARCHAR(255),
  faculty              VARCHAR(255),
  academic_rank        VARCHAR(100),
  staff_id             VARCHAR(100),
  phone                VARCHAR(50),
  avatar               VARCHAR(500),
  email_notifications  TINYINT(1) NOT NULL DEFAULT 1,
  application_alerts   TINYINT(1) NOT NULL DEFAULT 1,
  deadline_reminders   TINYINT(1) NOT NULL DEFAULT 1,
  reviewer_feedback    TINYINT(1) NOT NULL DEFAULT 1,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Grants ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grants (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title                 VARCHAR(255)   NOT NULL,
  description           TEXT,
  category              VARCHAR(100),
  total_budget          DECIMAL(15,2),
  max_per_applicant     DECIMAL(15,2),
  min_per_applicant     DECIMAL(15,2),
  eligibility_location  VARCHAR(255),
  requirements          JSON,
  application_deadline  DATE,
  review_period         DATE,
  disbursement_date     DATE,
  announcement_date     DATE,
  status                ENUM('draft','active','pending','closed') NOT NULL DEFAULT 'draft',
  created_by            INT UNSIGNED,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Applications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grant_id              INT UNSIGNED NOT NULL,
  user_id               INT UNSIGNED NOT NULL,
  full_name             VARCHAR(255),
  staff_id              VARCHAR(100),
  institution           VARCHAR(255),
  faculty               VARCHAR(255),
  academic_rank         VARCHAR(100),
  email                 VARCHAR(191),
  phone                 VARCHAR(50),
  research_title        VARCHAR(500),
  research_area         VARCHAR(255),
  research_category     VARCHAR(100),
  research_duration     INT,
  objectives            TEXT,
  methodology           TEXT,
  research_problem      TEXT,
  research_outcomes     TEXT,
  research_location     VARCHAR(255),
  proposed_start_date   DATE,
  proposed_end_date     DATE,
  requested_amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
  impact_beneficiaries  TEXT,
  impact_societal       TEXT,
  impact_academic       TEXT,
  impact_innovation     TEXT,
  impact_risk           TEXT,
  budget_items          JSON,
  digital_signature     VARCHAR(255),
  declaration_date      DATE,
  status                ENUM('submitted','under-review','approved','rejected') NOT NULL DEFAULT 'submitted',
  reviewer_notes        TEXT,
  reviewed_by           INT UNSIGNED,
  reviewed_at           TIMESTAMP NULL,
  score                 TINYINT UNSIGNED,
  submitted_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (grant_id)    REFERENCES grants(id)  ON DELETE CASCADE,
  FOREIGN KEY (user_id)     REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id)   ON DELETE SET NULL,
  INDEX idx_status  (status),
  INDEX idx_user    (user_id),
  INDEX idx_grant   (grant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Application Documents ────────────────────────────────────
-- file_id is the unique generated filename (e.g. doc_64f1ab... .pdf)
-- returned by helpers/Upload.php — UploadController looks files up by it.
CREATE TABLE IF NOT EXISTS application_documents (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id   INT UNSIGNED NOT NULL,
  file_id          VARCHAR(100),
  label            VARCHAR(255),
  file_name        VARCHAR(255),
  file_path        VARCHAR(500),
  file_size        INT UNSIGNED,
  mime_type        VARCHAR(100),
  uploaded_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_file_id (file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Beneficiaries ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beneficiaries (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id   INT UNSIGNED NOT NULL,
  user_id          INT UNSIGNED NOT NULL,
  grant_id         INT UNSIGNED NOT NULL,
  amount           DECIMAL(15,2),
  status           ENUM('pending','paid','disbursed','not-paid') NOT NULL DEFAULT 'pending',
  payment_date     DATE,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)        REFERENCES users(id)        ON DELETE CASCADE,
  FOREIGN KEY (grant_id)       REFERENCES grants(id)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Messages (two-way threading) ─────────────────────────────
-- thread_id : id of the root message in the thread (root points to itself)
-- parent_id : the message this one replies to (NULL for root messages)
-- sender_role: 'admin' | 'applicant' | 'system' — drives bubble alignment in UI
-- sender_id : users.id of the actual sender (nullable for system messages)
CREATE TABLE IF NOT EXISTS messages (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,          -- the applicant the thread belongs to
  thread_id    INT UNSIGNED NULL,
  parent_id    INT UNSIGNED NULL,
  subject      VARCHAR(255),
  message      TEXT,
  sender       VARCHAR(100) NOT NULL DEFAULT 'Grant Committee',
  sender_role  ENUM('admin','applicant','system') NOT NULL DEFAULT 'system',
  sender_id    INT UNSIGNED NULL,
  is_read      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id)    ON DELETE SET NULL,
  FOREIGN KEY (thread_id) REFERENCES messages(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_thread    (thread_id),
  INDEX idx_parent    (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  title       VARCHAR(255),
  message     TEXT,
  is_read     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Audit Logs (used by controllers/AuditController.php) ─────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NULL,
  action      VARCHAR(255) NOT NULL,
  detail      TEXT,
  level       ENUM('info','warning','error','critical') NOT NULL DEFAULT 'info',
  ip_address  VARCHAR(64),
  user_agent  VARCHAR(255),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_level   (level),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Seed: default admin account ──────────────────────────────
-- Email:    admin@grantsystem.com
-- Password: Admin@1234   (CHANGE THIS immediately after first login)
INSERT INTO users (first_name, last_name, email, password, role, status)
VALUES ('Admin', 'User', 'admin@grantsystem.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'admin', 'active')
ON DUPLICATE KEY UPDATE id = id;

-- ─────────────────────────────────────────────────────────────
-- MIGRATION (only if you ALREADY have data and don't want to
-- drop the database — run these instead of re-importing):
-- ─────────────────────────────────────────────────────────────
-- ALTER TABLE messages
--   ADD COLUMN thread_id   INT UNSIGNED NULL AFTER user_id,
--   ADD COLUMN parent_id   INT UNSIGNED NULL AFTER thread_id,
--   ADD COLUMN sender_role ENUM('admin','applicant','system') NOT NULL DEFAULT 'system' AFTER sender,
--   ADD COLUMN sender_id   INT UNSIGNED NULL AFTER sender_role,
--   ADD INDEX idx_thread (thread_id),
--   ADD INDEX idx_parent (parent_id);
-- UPDATE messages SET thread_id = id WHERE thread_id IS NULL;
--
-- ALTER TABLE application_documents
--   ADD COLUMN file_id VARCHAR(100) NULL AFTER application_id,
--   ADD INDEX idx_file_id (file_id);
--
-- (audit_logs: just run the CREATE TABLE block above on its own)
