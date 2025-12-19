-- Add form link features for personalized links and enhanced tracking
-- Run this migration to add support for:
-- - Personalized form links with client_id
-- - Link expiry configuration
-- - Submission source tracking
-- - AI summaries for form submissions

-- Create form_links table for tracking personalized links
CREATE TABLE IF NOT EXISTS form_links (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  link_token VARCHAR(64) UNIQUE NOT NULL,
  link_type VARCHAR(20) DEFAULT 'generic' CHECK (link_type IN ('generic', 'personalized')),
  expires_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Add indexes for form_links
CREATE INDEX IF NOT EXISTS idx_form_links_token ON form_links(link_token);
CREATE INDEX IF NOT EXISTS idx_form_links_form_id ON form_links(form_id);
CREATE INDEX IF NOT EXISTS idx_form_links_client_id ON form_links(client_id);

-- Add new columns to form_submissions table
ALTER TABLE form_submissions
  ADD COLUMN IF NOT EXISTS submitted_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS submitted_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS link_id INTEGER REFERENCES form_links(id),
  ADD COLUMN IF NOT EXISTS link_type VARCHAR(20) DEFAULT 'generic';

-- Add column for tracking unlinked submissions
ALTER TABLE form_submissions
  ADD COLUMN IF NOT EXISTS is_linked BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS linked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS linked_by INTEGER REFERENCES users(id);

-- Add form settings for link expiry
ALTER TABLE form_templates
  ADD COLUMN IF NOT EXISTS default_link_expiry_days INTEGER DEFAULT 14,
  ADD COLUMN IF NOT EXISTS notify_on_submission BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS assigned_clinician INTEGER REFERENCES users(id);

-- Create index for finding unlinked submissions
CREATE INDEX IF NOT EXISTS idx_submissions_unlinked ON form_submissions(is_linked) WHERE is_linked = FALSE;

-- Add constraint to ensure submitted_email is stored
-- (We don't want submissions without a way to identify the submitter)
