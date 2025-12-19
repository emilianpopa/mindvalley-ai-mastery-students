-- Add missing fields to clients table for enhanced client management
-- This migration adds address and medical information fields

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS address VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS medical_history TEXT,
  ADD COLUMN IF NOT EXISTS current_medications TEXT,
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update status column to use our new values
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_status_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_status_check CHECK (status IN ('active', 'inactive', 'archived', 'enabled', 'disabled'));

-- Update existing 'enabled' status to 'active'
UPDATE clients SET status = 'active' WHERE status = 'enabled';

-- Update existing 'disabled' status to 'inactive'
UPDATE clients SET status = 'inactive' WHERE status = 'disabled';

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
