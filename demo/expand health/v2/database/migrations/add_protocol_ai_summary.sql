-- Migration: Add AI Summary column to protocols table
-- This column stores the AI-generated summary of the protocol

ALTER TABLE protocols
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Add index for faster queries when filtering by protocols with summaries
CREATE INDEX IF NOT EXISTS idx_protocols_ai_summary_exists
ON protocols ((ai_summary IS NOT NULL));

-- Comment for documentation
COMMENT ON COLUMN protocols.ai_summary IS 'AI-generated summary of the protocol content';
