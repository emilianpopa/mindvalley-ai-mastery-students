-- Migration: Add location_id to appointments table
-- This allows tracking which venue/room an appointment is booked in

-- Add location_id column to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_location ON appointments(location_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully added location_id column to appointments table';
END $$;
