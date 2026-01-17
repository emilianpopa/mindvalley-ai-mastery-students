-- Migration: Add Time Block Support
-- Adds is_time_block column to distinguish time blocks from regular appointments

-- Add is_time_block column to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS is_time_block BOOLEAN DEFAULT false;

-- Create index for filtering time blocks
CREATE INDEX IF NOT EXISTS idx_appointments_is_time_block ON appointments(is_time_block);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Time block support added to appointments table!';
END $$;
