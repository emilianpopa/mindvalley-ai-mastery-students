-- Add encryption support columns for PHI fields
-- This migration adds hash columns for searchable encrypted fields

-- Client PHI encryption support
-- Add hash columns for searchable fields
ALTER TABLE clients ADD COLUMN IF NOT EXISTS dob_hash VARCHAR(64);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_phone_hash VARCHAR(64);

-- Create indexes on hash columns for efficient searching
CREATE INDEX IF NOT EXISTS idx_clients_dob_hash ON clients(dob_hash);
CREATE INDEX IF NOT EXISTS idx_clients_emergency_phone_hash ON clients(emergency_phone_hash);

-- Labs PHI encryption support
-- No additional columns needed as we search by client_id not by PHI fields

-- Notes PHI encryption support
-- No additional columns needed as we search by client_id not by content

-- Form submissions PHI encryption support
-- No additional columns needed as we search by form_id/client_id not by answers

-- Add encryption metadata table
CREATE TABLE IF NOT EXISTS encryption_metadata (
    id SERIAL PRIMARY KEY,
    key_version INTEGER DEFAULT 1,
    algorithm VARCHAR(50) DEFAULT 'aes-256-gcm',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rotated_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Insert initial encryption key version
INSERT INTO encryption_metadata (key_version, notes)
VALUES (1, 'Initial encryption key')
ON CONFLICT DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE encryption_metadata IS 'Tracks encryption key versions for PHI field-level encryption. Key version helps with key rotation.';
