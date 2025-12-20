-- Migration: Add PDF file storage in database
-- This stores PDFs as binary data to persist across Railway deployments

-- Add file_data column to store PDF binary data
ALTER TABLE labs ADD COLUMN IF NOT EXISTS file_data BYTEA;

-- Add file_mime_type column to store content type
ALTER TABLE labs ADD COLUMN IF NOT EXISTS file_mime_type VARCHAR(100) DEFAULT 'application/pdf';

-- Add original_filename column to preserve original name
ALTER TABLE labs ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);

-- Comment explaining the approach
COMMENT ON COLUMN labs.file_data IS 'Binary storage for PDF files - ensures persistence across Railway deployments';
