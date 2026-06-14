-- ─────────────────────────────────────────────────────────────
--  Migration: Add disbursement columns to beneficiaries table
--  Run once on the `grant_system` database.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE beneficiaries
  ADD COLUMN payment_method  VARCHAR(50)  NULL AFTER status,
  ADD COLUMN transaction_ref VARCHAR(100) NULL AFTER payment_method,
  ADD COLUMN note            TEXT         NULL AFTER transaction_ref;
